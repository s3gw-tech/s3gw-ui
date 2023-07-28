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

import pydash
import pytest

from backend.api import S3GWClient, object

created_buckets: List[str] = []

# bucket_name -> set of object names
created_objects: dict[str, set[str]] = {}


def generate_object_name_set(amount: int) -> set[str]:
    res: set[str] = set()
    for _ in range(amount):
        res.add(str(uuid.uuid4()))
    return res


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
                await client.delete_objects(
                    Bucket=bucket_name,
                    Delete={
                        "Objects": list(
                            map(
                                lambda tag: {"Key": tag},
                                created_objects[bucket_name],
                            ),
                        ),
                        "Quiet": True,
                    },
                )
            except Exception:
                pass
            created_objects.pop(bucket_name)

            try:
                await client.delete_bucket(Bucket=bucket_name)
            except Exception:
                pass
        created_buckets.clear()


@pytest.mark.anyio
async def test_api_get_object_list_bucket_does_not_exist(
    s3_client: S3GWClient,
) -> None:
    res = await object.get_object_list(s3_client, bucket_name="not-exists")
    assert res is None


@pytest.mark.anyio
async def test_api_get_object_list(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = str(uuid.uuid4())
    created_buckets.append(bucket_name1)

    async with s3_client.conn() as client:
        await client.create_bucket(Bucket=bucket_name1)
        obj_names = generate_object_name_set(4)
        for obj_name in obj_names:
            await client.put_object(Bucket=bucket_name1, Key=obj_name)

    created_objects[bucket_name1] = obj_names

    res = await object.get_object_list(s3_client, bucket_name=bucket_name1)
    assert res is not None

    assert (
        pydash.get(
            res,
            "KeyCount",
        )
        == 4
    )

    obj_names_assert = obj_names.copy()

    for i in range(4):
        bucket_name: str = pydash.get(
            res,
            "Contents[{}].Key".format(i),
        )
        assert any(bucket_name in s for s in obj_names_assert)
        obj_names_assert.remove(bucket_name)
