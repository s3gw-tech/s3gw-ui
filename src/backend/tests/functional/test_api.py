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

import uuid
from typing import List, cast

import pytest
from fastapi import Response, status

from backend.api import S3GWClient, admin, buckets
from backend.api.types import BucketAttributes, Tag

created_buckets: List[str] = []
created_users: List[str] = []


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

        for uid in created_users:
            try:
                await admin.delete_user(s3_client, uid=uid)
            except (Exception,):
                pass
        created_users.clear()


@pytest.mark.anyio
async def test_create_user(s3_client: S3GWClient) -> None:
    uid1 = uuid.uuid4()
    name = f"DN {uid1}"
    email = f"{uid1}@email"
    res = await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name=name,
        email=email,
        access_key=str(uid1),
        secret_key=str(uid1),
        generate_key=False,
        max_buckets=101,
        suspended=False,
    )
    assert res.user_id == str(uid1)
    assert res.display_name == name
    assert res.email == email
    assert res.max_buckets == 101
    assert res.suspended is False
    assert res.tenant == ""


@pytest.mark.anyio
async def test_get_user(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    res = await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        generate_key=True,
        max_buckets=103,
        suspended=True,
    )
    assert res.user_id == str(uid1)
    res = await admin.get_user(s3_client, uid=str(uid1), stats=False)
    assert res.user_id == str(uid1)
    assert res.display_name == "DN" + str(uid1)
    assert res.email == str(uid1) + "@email"
    assert res.max_buckets == 103
    assert res.suspended is True
    assert res.tenant == ""


@pytest.mark.anyio
async def test_delete_user(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    res = await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        access_key=str(uid1),
        secret_key=str(uid1),
        generate_key=False,
        max_buckets=105,
        suspended=False,
    )
    assert res.user_id == str(uid1)
    await admin.delete_user(s3_client, uid=str(uid1))


@pytest.mark.anyio
async def test_list_uids(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    uid2 = uuid.uuid4()
    created_users.append(str(uid1))
    created_users.append(str(uid2))

    await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        access_key=str(uid1),
        secret_key=str(uid1),
        generate_key=False,
        max_buckets=105,
        suspended=False,
    )
    await admin.create_user(
        s3_client,
        uid=str(uid2),
        display_name="DN" + str(uid2),
        email=str(uid2) + "@email",
        access_key=str(uid2),
        secret_key=str(uid2),
        generate_key=False,
        max_buckets=105,
        suspended=False,
    )

    created_users.append("testid")

    res: List[str] = cast(
        List[str], await admin.list_users(s3_client, details=False)
    )
    assert len(res) == 3
    assert any(res[0] in s for s in created_users)
    assert any(res[1] in s for s in created_users)
    assert any(res[2] in s for s in created_users)

    created_users.remove("testid")


@pytest.mark.anyio
async def test_create_key(s3_client: S3GWClient, response: Response) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        access_key=str(uid1),
        secret_key=str(uid1),
        generate_key=False,
        max_buckets=105,
        suspended=False,
    )

    await admin.create_user_key(
        s3_client,
        response,
        str(uid1),
        False,
        "zz" + str(uid1),
        "zz" + str(uid1),
    )
    assert "location" in response.headers


@pytest.mark.anyio
async def test_get_keys(s3_client: S3GWClient) -> None:
    res = await admin.get_user_keys(s3_client, "testid")
    assert len(res) == 1
    assert res[0].user == "testid"
    assert res[0].access_key == "test"
    assert res[0].secret_key == "test"


@pytest.mark.anyio
async def test_delete_key(s3_client: S3GWClient, response: Response) -> None:
    global created_users
    uid1 = str(uuid.uuid4())
    created_users.append(uid1)

    await admin.create_user(
        s3_client,
        uid=uid1,
        display_name="DN" + uid1,
        email=uid1 + "@email",
        access_key="zz" + uid1,
        secret_key="zz" + uid1,
        generate_key=False,
        max_buckets=105,
        suspended=False,
    )

    await admin.create_user_key(s3_client, response, uid1, True)
    assert "location" in response.headers

    res = await admin.get_user_keys(s3_client, uid1)
    assert len(res) == 2

    await admin.delete_user_key(s3_client, uid1, res[0].access_key)

    res = await admin.get_user_keys(s3_client, uid1)
    assert len(res) == 1
    assert res[0].user == uid1
    assert res[0].access_key == "zz" + uid1
    assert res[0].secret_key == "zz" + uid1


@pytest.mark.anyio
async def test_quota_update(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        access_key=str(uid1),
        secret_key=str(uid1),
        generate_key=False,
        max_buckets=105,
        suspended=False,
    )
    await admin.update_user_quota(s3_client, str(uid1), 998, 2000, True)


@pytest.mark.anyio
async def test_bucket_list(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1 = uuid.uuid4()
    bucket2 = uuid.uuid4()
    bucket3 = uuid.uuid4()
    created_buckets.append(str(bucket1))
    created_buckets.append(str(bucket2))
    created_buckets.append(str(bucket3))

    await buckets.create_bucket(s3_client, str(bucket1))
    await buckets.create_bucket(s3_client, str(bucket3))
    await buckets.create_bucket(s3_client, str(bucket2))
    res = await admin.list_user_buckets(s3_client, "testid")
    assert len(res) == 3
    assert any(res[0].bucket in s for s in created_buckets)
    assert any(res[1].bucket in s for s in created_buckets)
    assert any(res[2].bucket in s for s in created_buckets)
    assert res[0].owner == "testid"
    assert res[1].owner == "testid"
    assert res[2].owner == "testid"


@pytest.mark.anyio
async def test_bucket_info(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1 = uuid.uuid4()
    created_buckets.append(str(bucket1))
    await buckets.create_bucket(s3_client, str(bucket1))
    res = await buckets.bucket_exists(s3_client, str(bucket1))
    assert res.status_code == status.HTTP_200_OK


@pytest.mark.anyio
async def test_api_versioning_2(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    created_buckets.append(bucket1)

    async with s3_client.conn() as client:
        await client.create_bucket(
            Bucket=bucket1, ObjectLockEnabledForBucket=True
        )

    res = await buckets.get_bucket_object_lock_configuration(s3_client, bucket1)
    assert res.ObjectLockEnabled is True

    res = await buckets.set_bucket_versioning(s3_client, bucket1, False)
    assert res is False

    res = await buckets.get_bucket_versioning(s3_client, bucket1)
    assert res is True


@pytest.mark.anyio
async def test_api_bucket_update_1(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    created_buckets.append(bucket1)

    # Test update calls
    #
    # - ObjectLock configuration
    # - Tags
    #
    # Test update doesn't call
    #
    # - Versioning
    #

    await buckets.create_bucket(s3_client, bucket1, enable_object_locking=True)

    attrs1 = BucketAttributes(
        Name=bucket1,
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
        bucket1,
        attributes=attrs1,
    )

    assert res == attrs1

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket1)

    assert res == gba_res


@pytest.mark.anyio
async def test_api_bucket_update_2(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    created_buckets.append(bucket1)

    # Test update calls
    #
    # - ObjectLock configuration
    #
    # Test update doesn't call
    #
    # - Versioning
    # - Tags
    #

    await buckets.create_bucket(s3_client, bucket1, enable_object_locking=True)

    attrs1 = BucketAttributes(
        Name=bucket1,
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
        bucket1,
        attributes=attrs1,
    )

    assert res == attrs1

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket1)

    assert res == gba_res


@pytest.mark.anyio
async def test_api_bucket_update_3(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    created_buckets.append(bucket1)

    # Test update calls
    #
    # - Versioning
    # - Tags
    #
    # Test update doesn't call
    #
    # - ObjectLock configuration
    #

    await buckets.create_bucket(s3_client, bucket1)

    attrs1 = BucketAttributes(
        Name=bucket1,
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
        bucket1,
        attributes=attrs1,
    )

    assert res.ObjectLockEnabled is False
    assert res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(res.TagSet) == set(attrs1.TagSet)

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket1)

    assert gba_res.ObjectLockEnabled is False
    assert gba_res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(gba_res.TagSet) == set(attrs1.TagSet)


@pytest.mark.anyio
async def test_api_bucket_update_4(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    created_buckets.append(bucket1)

    # Test update calls
    #
    # Test update doesn't call
    #
    # - Versioning
    # - ObjectLock configuration
    # - Tags
    #

    await buckets.create_bucket(s3_client, bucket1)

    attrs1 = BucketAttributes(
        Name=bucket1,
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
        bucket1,
        attributes=attrs1,
    )

    assert res.ObjectLockEnabled is False
    assert res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(res.TagSet) == set(attrs1.TagSet)

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket1)

    assert gba_res.ObjectLockEnabled is False
    assert gba_res.VersioningEnabled == attrs1.VersioningEnabled
    assert set(gba_res.TagSet) == set(attrs1.TagSet)


@pytest.mark.anyio
async def test_api_bucket_update_5(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket1: str = str(uuid.uuid4())
    created_buckets.append(bucket1)

    # Test update calls
    #
    # - Versioning
    # - ObjectLock configuration
    # - Tags
    #
    # Test update doesn't call
    #
    #

    await buckets.create_bucket(s3_client, bucket1, enable_object_locking=True)

    attrs1 = BucketAttributes(
        Name=bucket1,
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
        bucket1,
        attributes=attrs1,
    )

    # we expect the call to set VersioningEnabled = False to have failed.
    # we set attrs1.VersioningEnabled with the opposite of what requested
    # so that the assertion will succeed.
    attrs1.VersioningEnabled = True

    assert res == attrs1

    gba_res = await buckets.get_bucket_attributes(s3_client, bucket1)

    assert attrs1 == gba_res
