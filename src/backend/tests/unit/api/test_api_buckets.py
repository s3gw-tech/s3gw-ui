# Copyright 2023 SUSE LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import contextlib
import uuid
from typing import Any, List

import pydash
import pytest
from fastapi import HTTPException, status
from pytest_mock import MockerFixture

from backend.api import S3GWClient, buckets
from backend.api.types import BucketAttributes, BucketObjectLock, Tag

created_buckets: List[str] = []


@pytest.fixture(autouse=True)
async def run_before_and_after_tests(s3_client: S3GWClient):
    global created_buckets

    """Fixture to execute asserts before and after a test is run"""
    # Setup: fill with any logic you want
    print("---> Setup")

    yield  # this is where the testing happens

    # Teardown : fill with any logic you want
    print("<--- Teardown")
    async with s3_client.conn() as client:
        for bucket_name in created_buckets:
            try:
                await client.delete_bucket(Bucket=bucket_name)
            except Exception:
                pass
        created_buckets.clear()


@pytest.mark.anyio
async def test_api_list_bucket(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    bucket_name2 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))
    created_buckets.append(str(bucket_name2))

    # create a couple of buckets
    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=str(bucket_name1))
        await client.create_bucket(Bucket=str(bucket_name2))

    res: List[buckets.Bucket] = await buckets.list_buckets(s3_client)
    print(f"bucket list res: {res}")
    print(f"created buckets: {created_buckets}")
    assert len(res) == 2
    assert any(res[0].Name in s for s in created_buckets)
    assert any(res[1].Name in s for s in created_buckets)
    assert len(res) == 2


@pytest.mark.anyio
async def test_api_create_bucket(
    s3_client: S3GWClient, is_mock_server: bool, mocker: MockerFixture
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=False
    )

    raised = False
    try:
        await buckets.create_bucket(
            s3_client, str(bucket_name1), enable_object_locking=False
        )
    except HTTPException as e:
        assert e.status_code == status.HTTP_409_CONFLICT
        assert e.detail == "Bucket already exists"
        raised = True

    # apparently the moto mock server will always return success even if a
    # bucket already exists, whereas s3gw will be compliant with S3 semantics
    # and return an error about the bucket already existing.
    if is_mock_server:
        assert not raised
    else:
        assert raised

    # test whether we actually raise the appropriate HTTPException if an error
    # is found.
    orig_conn = s3_client.conn

    class MockClient:
        def __init__(self):
            self._error_to_raise = None
            self._exception_to_raise = None

        def _mock_create_bucket(self, *args: Any, **kwargs: Any):
            assert self._exception_to_raise is not None
            raise self._exception_to_raise

        def set_error(self, error: str) -> None:
            self._error_to_raise = error

        @contextlib.asynccontextmanager
        async def conn(self):
            async with orig_conn() as client:
                assert self._error_to_raise is not None
                if self._error_to_raise == "exists":
                    self._exception_to_raise = (
                        client.exceptions.BucketAlreadyExists(
                            {"foo": "bar"}, "create_bucket"
                        )
                    )
                elif self._error_to_raise == "owned":
                    self._exception_to_raise = (
                        client.exceptions.BucketAlreadyOwnedByYou(
                            {"foo": "bar"}, "create_bucket"
                        )
                    )
                client.create_bucket = self._mock_create_bucket
                yield client

    f = MockClient()
    mocker.patch.object(s3_client, "conn", f.conn)

    raised = False
    try:
        f.set_error("exists")
        await buckets.create_bucket(s3_client, "baz", False)
    except HTTPException as e:
        assert e.status_code == 409
        assert e.detail == "Bucket already exists"
        raised = True
    assert raised

    raised = False
    try:
        f.set_error("owned")
        await buckets.create_bucket(s3_client, "baz", False)
    except HTTPException as e:
        assert e.status_code == 409
        assert e.detail == "Bucket already owned by requester"
        raised = True
    assert raised


@pytest.mark.anyio
async def test_api_tagging(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=str(bucket_name1))

    # test success
    sbt_res = await buckets.set_bucket_tagging(
        s3_client, str(bucket_name1), [{"Key": "kkk", "Value": "vvv"}]
    )
    assert sbt_res

    res: List[buckets.Tag] = await buckets.get_bucket_tagging(
        s3_client, str(bucket_name1)
    )
    assert len(res) == 1
    assert res[0].Key == "kkk"
    assert res[0].Value == "vvv"

    sbt_res = await buckets.set_bucket_tagging(s3_client, str(bucket_name1), [])
    assert sbt_res

    res: List[buckets.Tag] = await buckets.get_bucket_tagging(
        s3_client, str(bucket_name1)
    )
    assert len(res) == 0

    # test failure
    sbt_res = await buckets.set_bucket_tagging(
        s3_client, "not-exists", [{"Key": "kkk", "Value": "vvv"}]
    )
    assert not sbt_res


@pytest.mark.anyio
async def test_api_versioning(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    bucket_name2 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))
    created_buckets.append(str(bucket_name2))

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=str(bucket_name1))
        await client.create_bucket(
            Bucket=str(bucket_name2), ObjectLockEnabledForBucket=True
        )

    # test success

    enabled: bool = await buckets.get_bucket_versioning(
        s3_client, str(bucket_name1)
    )
    assert not enabled

    res = await buckets.set_bucket_versioning(
        s3_client, str(bucket_name1), True
    )
    assert res

    enabled = await buckets.get_bucket_versioning(s3_client, str(bucket_name1))
    assert enabled

    await buckets.set_bucket_versioning(s3_client, str(bucket_name1), False)
    enabled = await buckets.get_bucket_versioning(s3_client, str(bucket_name1))
    assert not enabled

    # test failure
    res = await buckets.set_bucket_versioning(
        s3_client, str(bucket_name2), False
    )
    assert not res

    enabled: bool = await buckets.get_bucket_versioning(
        s3_client, str(bucket_name2)
    )
    assert enabled


@pytest.mark.anyio
async def test_api_delete_bucket(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    total: int = len(await buckets.list_buckets(s3_client))

    await buckets.create_bucket(s3_client, str(bucket_name1))
    current: int = len(await buckets.list_buckets(s3_client))
    assert current == total + 1

    await buckets.delete_bucket(s3_client, str(bucket_name1))
    current = len(await buckets.list_buckets(s3_client))
    assert current == total


@pytest.mark.anyio
async def test_api_get_bucket_attributes(
    s3_client: S3GWClient, mock_get_bucket: Any
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=True
    )
    await buckets.set_bucket_versioning(s3_client, str(bucket_name1), True)
    res = await buckets.get_bucket_attributes(s3_client, str(bucket_name1))
    assert len(res.TagSet) == 0
    assert res.ObjectLockEnabled
    assert res.VersioningEnabled


@pytest.mark.anyio
async def test_api_get_bucket_attributes_failures(
    s3_client: S3GWClient, mock_get_bucket: Any, mocker: MockerFixture
) -> None:
    patch_funcs = [
        "backend.api.buckets.get_bucket",
        "backend.api.buckets.get_bucket_versioning",
        "backend.api.buckets.get_bucket_object_lock_configuration",
        "backend.api.buckets.get_bucket_tagging",
    ]

    for fn in patch_funcs:
        p = mocker.patch(fn)
        p.side_effect = Exception()
        error = False

        try:
            await buckets.get_bucket_attributes(s3_client, "foo")
        except HTTPException as e:
            assert e.status_code == 500
            error = True

        assert error

        p.side_effect = None
        p.return_value = True  # it doesn't matter at this point


@pytest.mark.anyio
async def test_api_bucket_exists(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=str(bucket_name1))

    res = await buckets.bucket_exists(s3_client, str(bucket_name1))
    assert res is True
    res = await buckets.bucket_exists(s3_client, str(uuid.uuid4()))
    assert res is False


@pytest.mark.anyio
async def test_api_get_bucket_object_lock_configuration(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    bucket_name2 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))
    created_buckets.append(str(bucket_name2))

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=True
    )
    await buckets.set_bucket_versioning(s3_client, str(bucket_name1), True)
    res = await buckets.get_bucket_object_lock_configuration(
        s3_client, str(bucket_name1)
    )
    assert res.ObjectLockEnabled is True
    await buckets.create_bucket(
        s3_client, str(bucket_name2), enable_object_locking=False
    )
    res = await buckets.get_bucket_object_lock_configuration(
        s3_client, str(bucket_name2)
    )
    assert res.ObjectLockEnabled is False


@pytest.mark.anyio
async def test_api_set_bucket_object_lock_configuration(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    bucket_name2 = uuid.uuid4()
    bucket_name3 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))
    created_buckets.append(str(bucket_name2))
    created_buckets.append(str(bucket_name3))

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=True
    )
    await buckets.set_bucket_versioning(s3_client, str(bucket_name1), True)
    config1 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
    )
    res = await buckets.set_bucket_object_lock_configuration(
        s3_client,
        str(bucket_name1),
        config=config1,
    )
    assert res == config1

    await buckets.create_bucket(
        s3_client, str(bucket_name2), enable_object_locking=True
    )
    await buckets.set_bucket_versioning(s3_client, str(bucket_name2), True)
    config2 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=5,
        RetentionUnit="Years",
    )
    res = await buckets.set_bucket_object_lock_configuration(
        s3_client,
        str(bucket_name2),
        config=config2,
    )
    assert res == config2

    await buckets.create_bucket(
        s3_client, str(bucket_name3), enable_object_locking=False
    )
    res = await buckets.set_bucket_object_lock_configuration(
        s3_client,
        str(bucket_name3),
        config=config1,
    )
    assert res.ObjectLockEnabled is False


@pytest.mark.anyio
async def test_api_bucket_update_1(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    # Test update calls
    #
    # - ObjectLock configuration
    # - Tags
    #
    # Test update doesn't call
    #
    # - Versioning
    #

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=True
    )

    attrs1 = BucketAttributes(
        Name=str(bucket_name1),
        CreationDate=None,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
        TagSet=[
            Tag(Key="tag1", Value="value1"),
            Tag(Key="tag2", Value="value2"),
        ],
        VersioningEnabled=True,
    )

    res = await buckets.update_bucket(
        s3_client,
        attributes=attrs1,
    )

    assert res == attrs1

    gba_res = await buckets.get_bucket_attributes(s3_client, str(bucket_name1))

    assert res == gba_res


@pytest.mark.anyio
async def test_api_bucket_update_2(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    # Test update calls
    #
    # - ObjectLock configuration
    #
    # Test update doesn't call
    #
    # - Versioning
    # - Tags
    #

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=True
    )

    attrs1 = BucketAttributes(
        Name=str(bucket_name1),
        CreationDate=None,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
        TagSet=[],
        VersioningEnabled=True,
    )

    res = await buckets.update_bucket(
        s3_client,
        attributes=attrs1,
    )

    assert res == attrs1

    gba_res = await buckets.get_bucket_attributes(s3_client, str(bucket_name1))

    assert res == gba_res


@pytest.mark.anyio
async def test_api_bucket_update_3(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    # Test update calls
    #
    # - Versioning
    # - Tags
    #
    # Test update doesn't call
    #
    # - ObjectLock configuration
    #

    await buckets.create_bucket(s3_client, str(bucket_name1))

    attrs1 = BucketAttributes(
        Name=str(bucket_name1),
        CreationDate=None,
        ObjectLockEnabled=False,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
        TagSet=[
            Tag(Key="tag1", Value="value1"),
            Tag(Key="tag2", Value="value2"),
        ],
        VersioningEnabled=True,
    )

    res = await buckets.update_bucket(
        s3_client,
        attributes=attrs1,
    )

    assert res.ObjectLockEnabled is False
    assert res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(res.TagSet) == set(attrs1.TagSet)

    gba_res = await buckets.get_bucket_attributes(s3_client, str(bucket_name1))

    assert gba_res.ObjectLockEnabled is False
    assert gba_res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(gba_res.TagSet) == set(attrs1.TagSet)


@pytest.mark.anyio
async def test_api_bucket_update_4(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    # Test update calls
    #
    # Test update doesn't call
    #
    # - Versioning
    # - ObjectLock configuration
    # - Tags
    #

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=False
    )

    attrs1 = BucketAttributes(
        Name=str(bucket_name1),
        CreationDate=None,
        ObjectLockEnabled=False,
        RetentionEnabled=False,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
        TagSet=[],
        VersioningEnabled=False,
    )

    res = await buckets.update_bucket(
        s3_client,
        attributes=attrs1,
    )

    assert res.ObjectLockEnabled is False
    assert res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(res.TagSet) == set(attrs1.TagSet)

    gba_res = await buckets.get_bucket_attributes(s3_client, str(bucket_name1))

    assert gba_res.ObjectLockEnabled is False
    assert gba_res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(gba_res.TagSet) == set(attrs1.TagSet)


@pytest.mark.anyio
async def test_api_bucket_update_5(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    # Test update calls
    #
    # - Versioning
    # - ObjectLock configuration
    # - Tags
    #
    # Test update doesn't call
    #
    #

    await buckets.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=True
    )

    attrs1 = BucketAttributes(
        Name=str(bucket_name1),
        CreationDate=None,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
        TagSet=[
            Tag(Key="tag1", Value="value1"),
            Tag(Key="tag2", Value="value2"),
        ],
        VersioningEnabled=False,
    )

    res = await buckets.update_bucket(
        s3_client,
        attributes=attrs1,
    )

    # we expect the call to set VersioningEnabled = False to have failed.
    # we set attrs1.VersioningEnabled with the opposite of what requested
    # so that the assertion will succeed.
    attrs1.VersioningEnabled = True

    assert res == attrs1s

    gba_res = await buckets.get_bucket_attributes(s3_client, str(bucket_name1))

    assert attrs1 == gba_res


@pytest.mark.anyio
async def test_api_get_bucket_lifecycle_configuration_not_exists(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    # test lifecycle configuration does not exist

    await buckets.create_bucket(s3_client, str(bucket_name1))

    res = await buckets.get_bucket_lifecycle_configuration(
        s3_client, str(bucket_name1)
    )

    assert res is None


@pytest.mark.anyio
async def test_api_put_get_bucket_lifecycle_configuration(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    await buckets.create_bucket(s3_client, str(bucket_name1))

    res = await buckets.set_bucket_lifecycle_configuration(
        s3_client,
        str(bucket_name1),
        config={
            "Rules": [
                {
                    "Expiration": {
                        "Days": 3650,
                    },
                    "Filter": {
                        "Prefix": "documents/",
                    },
                    "ID": "TestOnly",
                    "Status": "Enabled",
                    "Transitions": [
                        {
                            "Days": 365,
                            "StorageClass": "GLACIER",
                        },
                    ],
                },
            ],
        },
    )

    assert res is True

    res = await buckets.get_bucket_lifecycle_configuration(
        s3_client, str(bucket_name1)
    )

    assert res is not None

    assert (
        pydash.size(
            pydash.get(
                res,
                "Rules",
            )
        )
        == 1
    )

    assert (
        pydash.get(
            res,
            "Rules[0].Expiration.Days",
        )
        == 3650
    )

    assert (
        pydash.get(
            res,
            "Rules[0].Filter.Prefix",
        )
        == "documents/"
    )

    assert (
        pydash.get(
            res,
            "Rules[0].ID",
        )
        == "TestOnly"
    )

    assert (
        pydash.get(
            res,
            "Rules[0].Status",
        )
        == "Enabled"
    )

    assert (
        pydash.size(
            pydash.get(
                res,
                "Rules[0].Transitions",
            )
        )
        == 1
    )

    assert (
        pydash.get(
            res,
            "Rules[0].Transitions[0].Days",
        )
        == 365
    )

    assert (
        pydash.get(
            res,
            "Rules[0].Transitions[0].StorageClass",
        )
        == "GLACIER"
    )
