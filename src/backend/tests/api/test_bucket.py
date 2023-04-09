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

import pytest

from backend.api import S3GWClient, bucket


@pytest.mark.asyncio
async def test_api_bucket_list(s3_server: str) -> None:
    s3gw_client = S3GWClient(s3_server, "foo", "bar")

    # create a couple of buckets
    async with s3gw_client.conn() as client:
        await client.create_bucket(Bucket="foo")
        await client.create_bucket(Bucket="bar")

    res: bucket.BucketListResponse = await bucket.get_bucket_list(s3gw_client)
    assert "foo" in res.buckets
    assert "bar" in res.buckets
    assert len(res.buckets) == 2
