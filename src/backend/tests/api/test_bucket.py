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

from typing import List

import pytest
from fastapi import HTTPException, status

from backend.api import S3GWClient, bucket


@pytest.mark.anyio
async def test_api_list_bucket(s3_client: S3GWClient) -> None:
    # create a couple of buckets
    async with s3_client.conn() as client:
        await client.create_bucket(Bucket="foo")
        await client.create_bucket(Bucket="bar")

    res: List[bucket.BucketResponse] = await bucket.get_bucket_list(s3_client)
    buckets = ["foo", "bar"]
    assert any(res[0].Name in s for s in buckets)
    assert any(res[1].Name in s for s in buckets)
    assert len(res) == 2

    async with s3_client.conn() as client:
        await client.delete_bucket(Bucket="foo")
        await client.delete_bucket(Bucket="bar")


@pytest.mark.anyio
async def test_api_create_bucket(
    s3_client: S3GWClient, is_mock_server: bool
) -> None:
    await bucket.create_bucket(s3_client, "asdasd", enable_object_locking=False)

    raised = False
    try:
        await bucket.create_bucket(
            s3_client, "asdasd", enable_object_locking=False
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

    async with s3_client.conn() as client:
        await client.delete_bucket(Bucket="asdasd")


@pytest.mark.anyio
async def test_api_tagging(s3_client: S3GWClient) -> None:
    async with s3_client.conn() as client:
        await client.create_bucket(Bucket="foo")

    await bucket.set_bucket_tagging(
        s3_client, "foo", [{"Key": "kkk", "Value": "vvv"}]
    )
    res: List[bucket.Tag] = await bucket.get_bucket_tagging(s3_client, "foo")
    assert len(res) == 1
    assert res[0].Key == "kkk"
    assert res[0].Value == "vvv"

    await bucket.set_bucket_tagging(s3_client, "foo", [])
    res: List[bucket.Tag] = await bucket.get_bucket_tagging(s3_client, "foo")
    assert len(res) == 0

    async with s3_client.conn() as client:
        await client.delete_bucket(Bucket="foo")


@pytest.mark.anyio
async def test_api_versioning(s3_client: S3GWClient) -> None:
    async with s3_client.conn() as client:
        await client.create_bucket(Bucket="xyz")

    enabled: bool = await bucket.get_bucket_versioning(s3_client, "xyz")
    assert not enabled

    await bucket.set_bucket_versioning(s3_client, "xyz", True)
    enabled = await bucket.get_bucket_versioning(s3_client, "xyz")
    assert enabled

    await bucket.set_bucket_versioning(s3_client, "xyz", False)
    enabled = await bucket.get_bucket_versioning(s3_client, "xyz")
    assert not enabled

    async with s3_client.conn() as client:
        await client.delete_bucket(Bucket="xyz")


@pytest.mark.anyio
async def test_api_delete_bucket(s3_client: S3GWClient) -> None:
    total: int = await bucket.get_bucket_count(s3_client)

    await bucket.create_bucket(s3_client, "abc")
    current: int = await bucket.get_bucket_count(s3_client)
    assert current == total + 1

    await bucket.delete_bucket(s3_client, "abc")
    current = await bucket.get_bucket_count(s3_client)
    assert current == total


@pytest.mark.skip(reason="Admin Ops API is not mocked right now")
@pytest.mark.anyio
async def test_api_get_bucket_attributes(s3_client: S3GWClient) -> None:
    await bucket.create_bucket(s3_client, "zyx", enable_object_locking=True)
    await bucket.set_bucket_versioning(s3_client, "zyx", True)
    res = await bucket.get_bucket_attributes(s3_client, "zyx")
    assert len(res.TagSet) == 0
    assert res.ObjectLockEnabled
    assert res.VersioningEnabled

    async with s3_client.conn() as client:
        await client.delete_bucket(Bucket="xyz")
