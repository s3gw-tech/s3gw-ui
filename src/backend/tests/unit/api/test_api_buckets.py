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
from botocore.exceptions import ClientError
from fastapi import HTTPException, Response, status
from pytest_mock import MockerFixture

from backend.api import S3GWClient, buckets
from backend.api.types import BucketAttributes, BucketObjectLock, Tag, TagSet
from backend.tests.unit.helpers import S3ApiMock, async_return

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
        for bucket in created_buckets:
            try:
                await client.delete_bucket(Bucket=bucket)
            except (Exception,):
                pass
        created_buckets.clear()


@pytest.mark.anyio
async def test_api_list_bucket(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    bucket2: str = str(uuid.uuid4())
    created_buckets.append(bucket1)
    created_buckets.append(bucket2)

    res: List[buckets.Bucket] = await buckets.list_buckets(s3_client)
    count_before: int = len(res)

    # create a couple of buckets
    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=bucket1)
        await client.create_bucket(Bucket=bucket2)

    res: List[buckets.Bucket] = await buckets.list_buckets(s3_client)
    count_after: int = len(res)
    count_total: int = count_after - count_before

    assert count_total == 2
    assert any(res[0].Name in s for s in created_buckets)
    assert any(res[1].Name in s for s in created_buckets)


@pytest.mark.anyio
async def test_api_create_bucket(
    s3_client: S3GWClient,
    is_mock_server: bool,
    mocker: MockerFixture,
) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    await buckets.create_bucket(s3_client, bucket)

    res = await buckets.bucket_exists(s3_client, bucket)
    assert res.status_code == status.HTTP_200_OK

    raised = False
    try:
        await buckets.create_bucket(s3_client, bucket)
    except HTTPException as e:
        assert e.status_code == status.HTTP_409_CONFLICT
        assert e.detail == "Bucket already exists"
        raised = True

    # apparently the moto mock server will always return success even if a
    # bucket already exists, whereas s3gw will be compliant with S3 semantics
    # and return an error about the bucket already existing.
    if is_mock_server:
        assert raised is False
    else:
        assert raised is True

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
    assert raised is True

    raised = False
    try:
        f.set_error("owned")
        await buckets.create_bucket(s3_client, "baz", False)
    except HTTPException as e:
        assert e.status_code == 409
        assert e.detail == "Bucket already owned by requester"
        raised = True
    assert raised is True


@pytest.mark.anyio
async def test_api_tagging(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=bucket)

    # test success
    sbt_res = await buckets.set_bucket_tagging(
        s3_client,
        bucket,
        TagSet.parse_obj({"TagSet": [{"Key": "kkk", "Value": "vvv"}]}),
    )
    assert sbt_res

    res: List[buckets.Tag] = await buckets.get_bucket_tagging(s3_client, bucket)
    assert len(res) == 1
    assert res[0].Key == "kkk"
    assert res[0].Value == "vvv"

    sbt_res = await buckets.set_bucket_tagging(
        s3_client, bucket, TagSet(TagSet=[])
    )
    assert sbt_res

    res: List[buckets.Tag] = await buckets.get_bucket_tagging(s3_client, bucket)
    assert len(res) == 0

    # test failure
    sbt_res = await buckets.set_bucket_tagging(
        s3_client,
        "not-exists",
        TagSet.parse_obj({"TagSet": [{"Key": "kkk", "Value": "vvv"}]}),
    )
    assert not sbt_res


@pytest.mark.anyio
async def test_api_versioning(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=bucket)

    res = await buckets.get_bucket_versioning(s3_client, bucket)
    assert res is False

    res = await buckets.set_bucket_versioning(s3_client, bucket, True)
    assert res is True

    res = await buckets.get_bucket_versioning(s3_client, bucket)
    assert res is True

    await buckets.set_bucket_versioning(s3_client, bucket, False)
    assert res is True

    res = await buckets.get_bucket_versioning(s3_client, bucket)
    assert res is False


@pytest.mark.anyio
async def test_api_versioning_failure(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "put_bucket_versioning",
        side_effect=ClientError({}, "put_bucket_versioning"),
    )

    res = await buckets.set_bucket_versioning(s3_client, "foo", True)
    assert res is False


@pytest.mark.anyio
async def test_api_delete_bucket(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    total: int = len(await buckets.list_buckets(s3_client))

    await buckets.create_bucket(s3_client, bucket)
    current: int = len(await buckets.list_buckets(s3_client))
    assert current == total + 1

    await buckets.delete_bucket(s3_client, bucket)
    current = len(await buckets.list_buckets(s3_client))
    assert current == total


@pytest.mark.anyio
async def test_api_get_bucket_attributes(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    await buckets.create_bucket(s3_client, bucket, enable_object_locking=True)
    await buckets.set_bucket_versioning(s3_client, bucket, True)
    res = await buckets.get_bucket_attributes(s3_client, bucket)
    assert len(res.TagSet) == 0
    assert res.ObjectLockEnabled
    assert res.VersioningEnabled


@pytest.mark.anyio
async def test_api_get_bucket_attributes_failures(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    patch_funcs = [
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
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=bucket)

    res: Response = await buckets.bucket_exists(s3_client, bucket)
    assert res.status_code == status.HTTP_200_OK

    with pytest.raises(HTTPException) as e:
        await buckets.bucket_exists(s3_client, str(uuid.uuid4()))
    assert e.value.status_code == 404
    assert e.value.detail == "Not Found"


@pytest.mark.anyio
async def test_api_get_bucket_object_lock_configuration(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    bucket2: str = str(uuid.uuid4())
    created_buckets.append(bucket1)
    created_buckets.append(bucket2)

    await buckets.create_bucket(s3_client, bucket1, enable_object_locking=True)
    await buckets.set_bucket_versioning(s3_client, bucket1, True)
    res = await buckets.get_bucket_object_lock_configuration(s3_client, bucket1)
    assert res.ObjectLockEnabled is True
    await buckets.create_bucket(s3_client, bucket2)
    res = await buckets.get_bucket_object_lock_configuration(s3_client, bucket2)
    assert res.ObjectLockEnabled is False


@pytest.mark.anyio
async def test_api_set_bucket_object_lock_configuration(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    bucket2: str = str(uuid.uuid4())
    bucket3: str = str(uuid.uuid4())
    created_buckets.append(bucket1)
    created_buckets.append(bucket2)
    created_buckets.append(bucket3)

    await buckets.create_bucket(s3_client, bucket1, enable_object_locking=True)
    await buckets.set_bucket_versioning(s3_client, bucket1, True)
    config1 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
    )
    res = await buckets.set_bucket_object_lock_configuration(
        s3_client,
        bucket1,
        config=config1,
    )
    assert res == config1

    await buckets.create_bucket(s3_client, bucket2, enable_object_locking=True)
    await buckets.set_bucket_versioning(s3_client, bucket2, True)
    config2 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=5,
        RetentionUnit="Years",
    )
    res = await buckets.set_bucket_object_lock_configuration(
        s3_client,
        bucket2,
        config=config2,
    )
    assert res == config2

    await buckets.create_bucket(s3_client, bucket3)
    res = await buckets.set_bucket_object_lock_configuration(
        s3_client,
        bucket3,
        config=config1,
    )
    assert res.ObjectLockEnabled is False


@pytest.mark.anyio
async def test_api_get_bucket_lifecycle_configuration_not_exists(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    # test lifecycle configuration does not exist
    await buckets.create_bucket(s3_client, bucket)

    res = await buckets.get_bucket_lifecycle_configuration(s3_client, bucket)
    assert len(res["Rules"]) == 0


@pytest.mark.anyio
async def test_api_get_bucket_lifecycle_configuration_failure(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_bucket_lifecycle_configuration",
        side_effect=(
            ClientError(
                {"Error": {"Code": "NoSuchKey"}},
                "get_bucket_lifecycle_configuration",
            ),
        ),
    )

    with pytest.raises(HTTPException) as e:
        await buckets.get_bucket_lifecycle_configuration(s3_client, "test01")
    assert e.value.status_code == 500
    assert e.value.detail == "No such key"


@pytest.mark.anyio
async def test_api_set_bucket_lifecycle_configuration(
    s3_client: S3GWClient,
) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    await buckets.create_bucket(s3_client, bucket)

    res = await buckets.set_bucket_lifecycle_configuration(
        s3_client,
        bucket,
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

    res = await buckets.get_bucket_lifecycle_configuration(s3_client, bucket)

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


@pytest.mark.anyio
async def test_api_set_bucket_lifecycle_configuration_failure(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "put_bucket_lifecycle_configuration",
        side_effect=ClientError({}, "put_bucket_lifecycle_configuration"),
    )

    res = await buckets.set_bucket_lifecycle_configuration(
        s3_client,
        "bar",
        config={
            "Rules": [
                {
                    "Expiration": {
                        "Days": 100,
                    },
                    "Filter": {
                        "Prefix": "data/",
                    },
                    "ID": "TestOnly",
                    "Status": "Enabled",
                },
            ],
        },
    )
    assert res is False


@pytest.mark.anyio
async def test_api_delete_bucket_lifecycle_configuration(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch("delete_bucket_lifecycle", return_value=async_return(True))

    res = await buckets.set_bucket_lifecycle_configuration(
        s3_client,
        "bar",
        config={
            "Rules": [],
        },
    )
    assert res is True
    s3api_mock.mocked_fn["delete_bucket_lifecycle"].assert_called()


@pytest.mark.anyio
async def test_api_bucket_update_1(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    # Test update calls
    #
    # - ObjectLock configuration
    # - Tags
    #
    # Test update doesn't call
    #
    # - Versioning
    #

    await buckets.create_bucket(s3_client, bucket, enable_object_locking=True)

    attributes = BucketAttributes(
        Name=bucket,
        CreationDate=None,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=2,
        RetentionUnit="Years",
        TagSet=[
            Tag(Key="tag1", Value="value1"),
            Tag(Key="tag2", Value="value2"),
        ],
        VersioningEnabled=True,
    )

    ub_res = await buckets.update_bucket(
        s3_client,
        bucket,
        attributes=attributes,
    )
    assert ub_res == attributes

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket)
    assert ub_res == gba_res


@pytest.mark.anyio
async def test_api_bucket_update_2(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    # Test update calls
    #
    # - ObjectLock configuration
    #
    # Test update doesn't call
    #
    # - Versioning
    # - Tags
    #

    await buckets.create_bucket(s3_client, bucket, enable_object_locking=True)

    attributes = BucketAttributes(
        Name=bucket,
        CreationDate=None,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=12,
        RetentionUnit="Days",
        TagSet=[],
        VersioningEnabled=True,
    )

    ub_res = await buckets.update_bucket(
        s3_client,
        bucket,
        attributes=attributes,
    )
    assert ub_res == attributes

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket)
    assert ub_res == gba_res


@pytest.mark.anyio
async def test_api_bucket_update_3(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    # Test update calls
    #
    # - Versioning
    # - Tags
    #
    # Test update doesn't call
    #
    # - ObjectLock configuration
    #

    await buckets.create_bucket(s3_client, bucket)

    attributes = BucketAttributes(
        Name=bucket,
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

    ub_res = await buckets.update_bucket(
        s3_client,
        bucket,
        attributes=attributes,
    )
    assert ub_res.ObjectLockEnabled is False
    assert ub_res.VersioningEnabled == attributes.VersioningEnabled
    assert set(ub_res.TagSet) == set(attributes.TagSet)

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket)
    assert gba_res.ObjectLockEnabled is False
    assert gba_res.VersioningEnabled == attributes.VersioningEnabled
    assert set(gba_res.TagSet) == set(attributes.TagSet)


@pytest.mark.anyio
async def test_api_bucket_update_4(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket: str = str(uuid.uuid4())
    created_buckets.append(bucket)

    # Test update calls
    #
    # Test update doesn't call
    #
    # - Versioning
    # - ObjectLock configuration
    # - Tags
    #

    await buckets.create_bucket(s3_client, bucket)

    attributes = BucketAttributes(
        Name=bucket,
        CreationDate=None,
        ObjectLockEnabled=False,
        RetentionEnabled=False,
        RetentionMode="COMPLIANCE",
        RetentionValidity=1,
        RetentionUnit="Days",
        TagSet=[],
        VersioningEnabled=False,
    )

    ub_res = await buckets.update_bucket(
        s3_client,
        bucket,
        attributes=attributes,
    )
    assert ub_res.ObjectLockEnabled is False
    assert ub_res.VersioningEnabled == attributes.VersioningEnabled
    assert set(ub_res.TagSet) == set(attributes.TagSet)

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket)
    assert gba_res.ObjectLockEnabled is False
    assert gba_res.VersioningEnabled == attributes.VersioningEnabled
    assert set(gba_res.TagSet) == set(attributes.TagSet)
