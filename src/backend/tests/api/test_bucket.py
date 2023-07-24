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
from typing import List

import pytest
from fastapi import HTTPException, status

from backend.api import S3GWClient, bucket

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
            except:
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

    res: List[bucket.BucketResponse] = await bucket.get_bucket_list(s3_client)
    assert any(res[0].Name in s for s in created_buckets)
    assert any(res[1].Name in s for s in created_buckets)
    assert len(res) == 2


@pytest.mark.anyio
async def test_api_create_bucket(
    s3_client: S3GWClient, is_mock_server: bool
) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    await bucket.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=False
    )

    raised = False
    try:
        await bucket.create_bucket(
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


@pytest.mark.anyio
async def test_api_tagging(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=str(bucket_name1))

    await bucket.set_bucket_tagging(
        s3_client, str(bucket_name1), [{"Key": "kkk", "Value": "vvv"}]
    )
    res: List[bucket.Tag] = await bucket.get_bucket_tagging(
        s3_client, str(bucket_name1)
    )
    assert len(res) == 1
    assert res[0].Key == "kkk"
    assert res[0].Value == "vvv"

    await bucket.set_bucket_tagging(s3_client, str(bucket_name1), [])
    res: List[bucket.Tag] = await bucket.get_bucket_tagging(
        s3_client, str(bucket_name1)
    )
    assert len(res) == 0


@pytest.mark.anyio
async def test_api_versioning(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=str(bucket_name1))

    enabled: bool = await bucket.get_bucket_versioning(
        s3_client, str(bucket_name1)
    )
    assert not enabled

    await bucket.set_bucket_versioning(s3_client, str(bucket_name1), True)
    enabled = await bucket.get_bucket_versioning(s3_client, str(bucket_name1))
    assert enabled

    await bucket.set_bucket_versioning(s3_client, str(bucket_name1), False)
    enabled = await bucket.get_bucket_versioning(s3_client, str(bucket_name1))
    assert not enabled


@pytest.mark.anyio
async def test_api_delete_bucket(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    total: int = await bucket.get_bucket_count(s3_client)

    await bucket.create_bucket(s3_client, str(bucket_name1))
    current: int = await bucket.get_bucket_count(s3_client)
    assert current == total + 1

    await bucket.delete_bucket(s3_client, str(bucket_name1))
    current = await bucket.get_bucket_count(s3_client)
    assert current == total


@pytest.mark.anyio
async def test_api_get_bucket_attributes(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))

    await bucket.create_bucket(
        s3_client, str(bucket_name1), enable_object_locking=True
    )
    await bucket.set_bucket_versioning(s3_client, str(bucket_name1), True)
    res = await bucket.get_bucket_attributes(s3_client, str(bucket_name1))
    assert len(res.TagSet) == 0
    assert res.ObjectLockEnabled
    assert res.VersioningEnabled
