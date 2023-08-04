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

import datetime
from typing import List

import pytest
from pytest_mock import MockerFixture

from backend.api import S3GWClient, objects
from backend.api.types import Object
from backend.tests.unit.helpers import S3ApiMock, async_return

created_buckets: List[str] = []
created_objects: dict[str, set[str]] = {}


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
            except (Exception,):
                pass
            created_objects.pop(bucket_name)

            try:
                await client.delete_bucket(Bucket=bucket_name)
            except (Exception,):
                pass
        created_buckets.clear()


@pytest.mark.anyio
async def test_split_key_1() -> None:
    parts: List[str] = objects.split_key("/foo/bar/")
    assert parts == ["foo", "bar"]


@pytest.mark.anyio
async def test_split_key_2() -> None:
    parts: List[str] = objects.split_key("///baz///xyz///")
    assert parts == ["baz", "xyz"]


@pytest.mark.anyio
async def test_split_key_3() -> None:
    parts: List[str] = objects.split_key("")
    assert parts == []


@pytest.mark.anyio
async def test_build_key_1() -> None:
    key: str = objects.build_key("foo", ["bar", "baz"])
    assert key == "bar/baz/foo"


@pytest.mark.anyio
async def test_build_key_2() -> None:
    key: str = objects.build_key("foo//xyz//", ["bar", "baz"])
    assert key == "bar/baz/foo/xyz"


@pytest.mark.anyio
async def test_build_key_3() -> None:
    key: str = objects.build_key("foo/xyz", "/bar/baz")
    assert key == "bar/baz/foo/xyz"


@pytest.mark.anyio
async def test_build_key_4() -> None:
    key: str = objects.build_key("//foo//xyz/", "//bar//baz//")
    assert key == "bar/baz/foo/xyz"


@pytest.mark.anyio
async def test_build_key_5() -> None:
    key: str = objects.build_key("/foo", "")
    assert key == "foo"


@pytest.mark.anyio
async def test_get_object_list(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "list_objects_v2",
        return_value=async_return(
            {
                "IsTruncated": False,
                "Contents": [
                    {
                        "Key": "file2.txt",
                        "LastModified": datetime.datetime(
                            2023,
                            8,
                            3,
                            7,
                            38,
                            32,
                            206000,
                        ),
                        "ETag": '"d64d9778d4726d54386ed"',
                        "Size": 514,
                        "StorageClass": "STANDARD",
                    },
                ],
                "Name": "test01",
                "Prefix": "",
                "Delimiter": "/",
                "MaxKeys": 1000,
                "CommonPrefixes": [{"Prefix": "a/"}],
                "EncodingType": "url",
                "KeyCount": 1,
                "ContinuationToken": "",
            }
        ),
    )

    res = await objects.get_object_list(s3_client, "test01")
    assert [
        Object(
            Name="file2.txt",
            Type="OBJECT",
            Key="file2.txt",
            LastModified=datetime.datetime(2023, 8, 3, 7, 38, 32, 206000),
            ETag='"d64d9778d4726d54386ed"',
            Size=514,
        ),
        Object(
            Name="a",
            Type="FOLDER",
            Key="a",
            LastModified=None,
            ETag=None,
            Size=None,
        ),
    ] == res


@pytest.mark.anyio
async def test_get_object_list_truncated(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "list_objects_v2",
        side_effect=[
            async_return(
                {
                    "Contents": [
                        {
                            "Key": "file2.txt",
                            "LastModified": datetime.datetime(
                                2023,
                                8,
                                3,
                                7,
                                38,
                                32,
                                206000,
                            ),
                            "ETag": '"d64d9778d4726d54386ed"',
                            "Size": 514,
                            "StorageClass": "STANDARD",
                        },
                    ],
                    "Name": "test01",
                    "Prefix": "",
                    "Delimiter": "/",
                    "MaxKeys": 1000,
                    "CommonPrefixes": [],
                    "EncodingType": "url",
                    "KeyCount": 1,
                    "IsTruncated": True,
                    "ContinuationToken": "",
                    "NextContinuationToken": "foo",
                }
            ),
            async_return(
                {
                    "Contents": [
                        {
                            "Key": "file4.txt",
                            "LastModified": datetime.datetime(
                                2023,
                                8,
                                3,
                                15,
                                34,
                                59,
                                233000,
                            ),
                            "ETag": '"1f679c59605c1d914d892"',
                            "Size": 13796,
                            "StorageClass": "STANDARD",
                        },
                    ],
                    "Name": "test01",
                    "Prefix": "",
                    "Delimiter": "/",
                    "MaxKeys": 1000,
                    "CommonPrefixes": [],
                    "EncodingType": "url",
                    "KeyCount": 1,
                    "IsTruncated": False,
                    "ContinuationToken": "foo",
                }
            ),
        ],
    )

    res = await objects.get_object_list(s3_client, "test01")
    assert s3api_mock.mocked_fn["list_objects_v2"].call_count == 2
    assert [
        Object(
            Name="file2.txt",
            Type="OBJECT",
            Key="file2.txt",
            LastModified=datetime.datetime(2023, 8, 3, 7, 38, 32, 206000),
            ETag='"d64d9778d4726d54386ed"',
            Size=514,
        ),
        Object(
            Name="file4.txt",
            Type="OBJECT",
            Key="file4.txt",
            LastModified=datetime.datetime(
                2023,
                8,
                3,
                15,
                34,
                59,
                233000,
            ),
            ETag='"1f679c59605c1d914d892"',
            Size=13796,
        ),
    ] == res


@pytest.mark.anyio
async def test_get_object_list_failure(
    s3_client: S3GWClient,
) -> None:
    res = await objects.get_object_list(s3_client, bucket_name="not-exists")
    assert res is None
