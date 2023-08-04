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
import io
from typing import List

import pytest
from botocore.exceptions import ClientError
from fastapi import HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from pytest_mock import MockerFixture

from backend.api import S3GWClient, objects
from backend.api.types import (
    DeletedObject,
    DeleteObjectByPrefixRequest,
    DeleteObjectRequest,
    Object,
    ObjectAttributes,
    ObjectLockLegalHold,
    ObjectRequest,
    ObjectVersion,
    RestoreObjectRequest,
    SetObjectLockLegalHoldRequest,
    SetObjectTaggingRequest,
    Tag,
)
from backend.tests.unit.helpers import S3ApiMock, async_return


@pytest.fixture(autouse=True)
async def run_before_and_after_tests(s3_client: S3GWClient):
    """Fixture to execute asserts before and after a test is run"""
    # Setup: fill with any logic you want
    print("---> Setup")

    yield  # this is where the testing happens

    # Teardown : fill with any logic you want
    print("<--- Teardown")


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
                            2023, 8, 3, 7, 38, 32, 206000
                        ),
                        "ETag": '"d64d9778d4726d54386ed"',
                        "Size": 514,
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
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
            Owner={
                "DisplayName": "M. Tester",
                "ID": "testid",
            },
        ),
        Object(
            Name="a",
            Type="FOLDER",
            Key="a",
            LastModified=None,
            ETag=None,
            Size=None,
            Owner=None,
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
                                2023, 8, 3, 7, 38, 32, 206000
                            ),
                            "ETag": '"d64d9778d4726d54386ed"',
                            "Size": 514,
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
                                2023, 8, 3, 15, 34, 59, 233000
                            ),
                            "ETag": '"1f679c59605c1d914d892"',
                            "Size": 13796,
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
            LastModified=datetime.datetime(
                2023,
                8,
                3,
                7,
                38,
                32,
                206000,
            ),
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


@pytest.mark.anyio
async def test_object_exists(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "head_object",
        return_value=async_return(
            {
                "Key": "file2.txt",
                "VersionId": "kOTpzRH08N4TWDlXUz5U9BjZJm85sGV",
                "LastModified": "2023-08-07T09:01:14+00:00",
                "ETag": '"75ec5355d8c2c299d9ff530edbb248fc"',
                "ContentLength": 410,
                "ObjectLockMode": "COMPLIANCE",
                "ObjectLockRetainUntilDate": datetime.datetime(
                    2023, 11, 17, 5, 46, 33, 638114
                ),
                "ObjectLockLegalHoldStatus": "ON",
            }
        ),
    )

    res: Response = await objects.object_exists(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert res.status_code == status.HTTP_200_OK


@pytest.mark.anyio
async def test_object_exists_failure_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "head_object",
        side_effect=HTTPException(status_code=404, detail="Not Found"),
    )

    with pytest.raises(HTTPException) as e:
        await objects.object_exists(
            s3_client, "test01", ObjectRequest(Key="file2.txt")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "Not Found"


@pytest.mark.anyio
async def test_object_exists_failure_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "head_object",
        side_effect=(
            ClientError({"Error": {"Code": "NoSuchKey"}}, "head_object"),
        ),
    )

    with pytest.raises(HTTPException) as e:
        await objects.object_exists(
            s3_client, "test01", ObjectRequest(Key="foo.jpg")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "No such key"


@pytest.mark.anyio
async def test_get_object(s3_client: S3GWClient, mocker: MockerFixture) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "head_object",
        return_value=async_return(
            {
                "LastModified": datetime.datetime(
                    2023,
                    8,
                    7,
                    9,
                    45,
                    42,
                ),
                "ContentLength": 129440,
                "ETag": '"080a2712b02867eb6d2340a513d7ced2"',
                "VersionId": "UBMN7vJM52khoX9kJDSEqB2NjeAc.md",
                "ContentType": "image/jpeg",
                "ObjectLockLegalHoldStatus": "ON",
            }
        ),
    )

    res: Object = await objects.head_object(
        s3_client, "test01", ObjectRequest(Key="a/b/file1.jpg")
    )
    assert res.Key == "a/b/file1.jpg"
    assert res.Name == "file1.jpg"
    assert res.Type == "OBJECT"
    assert res.ObjectLockMode is None
    assert res.ObjectLockRetainUntilDate is None
    assert res.ObjectLockLegalHoldStatus == "ON"


@pytest.mark.anyio
async def test_get_object_versions_list(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "list_object_versions",
        return_value=async_return(
            {
                "IsTruncated": False,
                "KeyMarker": "",
                "VersionIdMarker": "",
                "Versions": [
                    {
                        "ETag": '"0d6c947604d695f58a4b844c3c0d4233"',
                        "Size": 423,
                        "Key": "file2.txt",
                        "VersionId": "CIK6I0PjVgN07UsZCp-8MQuovWyNsWn",
                        "IsLatest": False,
                        "LastModified": datetime.datetime(
                            2023, 8, 7, 12, 49, 30, 506000
                        ),
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
                    },
                    {
                        "ETag": '"d64d9775216d967b6d8d4726d54386ed"',
                        "Size": 514,
                        "Key": "file2.txt",
                        "VersionId": "Ur2Bs3wIHpOvEs2SYVuyG1FNnHA39Ie",
                        "IsLatest": False,
                        "LastModified": datetime.datetime(
                            2023, 8, 7, 12, 49, 24, 867000
                        ),
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
                    },
                    {
                        "ETag": '"75ec5355d8c2c299d9ff530edbb248fc"',
                        "Size": 410,
                        "Key": "file2.txt",
                        "VersionId": "-hwPDr9yyA4Vw2wSRJdMKaxMUANnDXD",
                        "IsLatest": False,
                        "LastModified": datetime.datetime(
                            2023, 8, 7, 12, 49, 19, 667000
                        ),
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
                    },
                ],
                "CommonPrefixes": [{"Prefix": "a/"}],
                "DeleteMarkers": [
                    {
                        "Key": "file2.txt",
                        "VersionId": "X59EG8NBZRM1.QY2blIPHF1RVaEJH7z",
                        "IsLatest": True,
                        "LastModified": datetime.datetime(
                            2023, 8, 7, 12, 49, 19, 667000
                        ),
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
                    },
                ],
                "Name": "test01",
                "Prefix": "",
                "Delimiter": "/",
                "MaxKeys": 1000,
            }
        ),
    )

    res = await objects.get_object_versions_list(s3_client, "test01")
    assert [
        ObjectVersion(
            Key="file2.txt",
            Name="file2.txt",
            Type="OBJECT",
            VersionId="CIK6I0PjVgN07UsZCp-8MQuovWyNsWn",
            LastModified=datetime.datetime(2023, 8, 7, 12, 49, 30, 506000),
            ETag='"0d6c947604d695f58a4b844c3c0d4233"',
            Size=423,
            Owner={
                "DisplayName": "M. Tester",
                "ID": "testid",
            },
            IsDeleted=False,
            IsLatest=False,
        ),
        ObjectVersion(
            Key="file2.txt",
            Name="file2.txt",
            Type="OBJECT",
            VersionId="Ur2Bs3wIHpOvEs2SYVuyG1FNnHA39Ie",
            LastModified=datetime.datetime(2023, 8, 7, 12, 49, 24, 867000),
            ETag='"d64d9775216d967b6d8d4726d54386ed"',
            Size=514,
            Owner={
                "DisplayName": "M. Tester",
                "ID": "testid",
            },
            IsDeleted=False,
            IsLatest=False,
        ),
        ObjectVersion(
            Key="file2.txt",
            Name="file2.txt",
            Type="OBJECT",
            VersionId="-hwPDr9yyA4Vw2wSRJdMKaxMUANnDXD",
            LastModified=datetime.datetime(2023, 8, 7, 12, 49, 19, 667000),
            ETag='"75ec5355d8c2c299d9ff530edbb248fc"',
            Size=410,
            Owner={
                "DisplayName": "M. Tester",
                "ID": "testid",
            },
            IsDeleted=False,
            IsLatest=False,
        ),
        ObjectVersion(
            Key="a",
            VersionId=None,
            LastModified=None,
            ETag=None,
            ObjectLockMode=None,
            ObjectLockRetainUntilDate=None,
            ObjectLockLegalHoldStatus=None,
            Owner=None,
            Name="a",
            Size=None,
            Type="FOLDER",
            IsDeleted=False,
            IsLatest=True,
        ),
        ObjectVersion(
            Key="file2.txt",
            Name="file2.txt",
            Type="OBJECT",
            VersionId="X59EG8NBZRM1.QY2blIPHF1RVaEJH7z",
            LastModified=datetime.datetime(2023, 8, 7, 12, 49, 19, 667000),
            ETag=None,
            Size=0,
            Owner={
                "DisplayName": "M. Tester",
                "ID": "testid",
            },
            IsDeleted=True,
            IsLatest=True,
        ),
    ] == res


@pytest.mark.anyio
async def test_get_object_tagging(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_tagging",
        return_value=async_return(
            {
                "TagSet": [
                    {
                        "Key": "Key1",
                        "Value": "Value1",
                    },
                ],
                "VersionId": "ydlaNkwWm0SfKJR.T1b1fIdPRbldTYRI",
                "ResponseMetadata": {
                    "...": "...",
                },
            }
        ),
    )

    res: List[Tag] = await objects.get_object_tagging(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert [
        Tag(Key="Key1", Value="Value1"),
    ] == res


@pytest.mark.anyio
async def test_get_object_tagging_failure_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_tagging",
        side_effect=ClientError(
            {"Error": {"Code": "NoSuchTagSet"}}, "get_object_tagging"
        ),
    )

    res: List[Tag] = await objects.get_object_tagging(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert res is not True  # List must be empty


@pytest.mark.anyio
async def test_get_object_tagging_failure_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_tagging",
        side_effect=HTTPException(status_code=404, detail="Bucket not found"),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_tagging(
            s3_client, "test01", ObjectRequest(Key="file2.txt")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "Bucket not found"


@pytest.mark.anyio
async def test_get_object_tagging_failure_3(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_tagging",
        side_effect=(
            ClientError({"Error": {"Code": "NoSuchKey"}}, "get_object_tagging"),
        ),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_tagging(
            s3_client, "test01", ObjectRequest(Key="baz.md")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "No such key"


@pytest.mark.anyio
async def test_set_object_tagging(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch("put_object_tagging", return_value=async_return({}))

    res = await objects.set_object_tagging(
        s3_client,
        "test01",
        SetObjectTaggingRequest(
            Key="file2.txt",
            TagSet=[
                Tag(Key="Key1", Value="Value1"),
                Tag(Key="Key2", Value="Value2"),
            ],
        ),
    )
    assert res is True


@pytest.mark.anyio
async def test_set_object_tagging_failure(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "put_object_tagging",
        side_effect=ClientError({}, "put_object_tagging"),
    )

    res = await objects.set_object_tagging(
        s3_client, "test01", SetObjectTaggingRequest(Key="file2.txt", TagSet=[])
    )
    assert res is False


@pytest.mark.anyio
async def test_get_object_retention(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_retention",
        return_value=async_return(
            {
                "Retention": {
                    "Mode": "GOVERNANCE",
                    "RetainUntilDate": datetime.datetime(2015, 1, 1),
                }
            }
        ),
    )

    res = await objects.get_object_retention(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert isinstance(res, dict)
    assert "RetainUntilDate" in res
    assert "Mode" in res
    assert res["Mode"] == "GOVERNANCE"


@pytest.mark.anyio
async def test_get_object_retention_failure_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_retention",
        side_effect=ClientError(
            {"Error": {"Code": "ObjectLockConfigurationNotFoundError"}},
            "get_object_retention",
        ),
    )

    res = await objects.get_object_retention(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert res is None


@pytest.mark.anyio
async def test_get_object_retention_failure_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_retention",
        side_effect=HTTPException(status_code=404, detail="Bucket not found"),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_retention(
            s3_client, "test01", ObjectRequest(Key="file2.txt")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "Bucket not found"


@pytest.mark.anyio
async def test_get_object_retention_failure_3(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_retention",
        side_effect=(
            ClientError(
                {"Error": {"Code": "NoSuchKey"}}, "get_object_retention"
            ),
        ),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_retention(
            s3_client, "test01", ObjectRequest(Key="baz.md")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "No such key"


@pytest.mark.anyio
async def test_get_object_legal_hold(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_legal_hold",
        return_value=async_return({"LegalHold": {"Status": "ON"}}),
    )

    res = await objects.get_object_legal_hold(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert res is not None
    assert res.Status == "ON"


@pytest.mark.anyio
async def test_get_object_legal_hold_failure_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_legal_hold",
        side_effect=ClientError(
            {"Error": {"Code": "ObjectLockConfigurationNotFoundError"}},
            "get_object_legal_hold",
        ),
    )

    res = await objects.get_object_legal_hold(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert res is None


@pytest.mark.anyio
async def test_get_object_legal_hold_failure_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_legal_hold",
        side_effect=HTTPException(status_code=404, detail="Bucket not found"),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_legal_hold(
            s3_client, "test01", ObjectRequest(Key="file2.txt")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "Bucket not found"


@pytest.mark.anyio
async def test_get_object_legal_hold_failure_3(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object_legal_hold",
        side_effect=(
            ClientError(
                {"Error": {"Code": "NoSuchKey"}}, "get_object_legal_hold"
            ),
        ),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_legal_hold(
            s3_client, "test01", ObjectRequest(Key="abc.jpg")
        )
    assert e.value.status_code == 404
    assert e.value.detail == "No such key"


@pytest.mark.anyio
async def test_set_object_legal_hold(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch("put_object_legal_hold", return_value=async_return({}))

    res = await objects.set_object_legal_hold(
        s3_client,
        "test01",
        SetObjectLockLegalHoldRequest(
            Key="file2.txt", LegalHold=ObjectLockLegalHold(Status="ON")
        ),
    )
    assert res is True


@pytest.mark.anyio
async def test_set_object_legal_hold_failure(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "put_object_legal_hold",
        side_effect=ClientError({}, "put_object_legal_hold"),
    )

    res = await objects.set_object_legal_hold(
        s3_client,
        "test01",
        SetObjectLockLegalHoldRequest(
            Key="file2.txt", LegalHold=ObjectLockLegalHold(Status="OFF")
        ),
    )
    assert res is False


@pytest.mark.anyio
async def test_get_object_attributes(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "head_object",
        return_value=async_return(
            {
                "LastModified": datetime.datetime(
                    2023,
                    8,
                    7,
                    9,
                    45,
                    42,
                ),
                "ContentLength": 129440,
                "ETag": '"080a2712b02867eb6d2340a513d7ced2"',
                "VersionId": "UBMN7vJM52khoX9kJDSEqB2NjeAc.md",
                "ContentType": "image/jpeg",
                "ObjectLockLegalHoldStatus": "ON",
            }
        ),
    )
    s3api_mock.patch(
        "get_object_tagging",
        return_value=async_return(
            {
                "TagSet": [
                    {
                        "Key": "Key1",
                        "Value": "Value1",
                    },
                ],
            }
        ),
    )

    res: ObjectAttributes = await objects.get_object_attributes(
        s3_client, "test01", ObjectRequest(Key="file2.txt")
    )
    assert res.Key == "file2.txt"
    assert res.Size == 129440
    assert res.ObjectLockLegalHoldStatus == "ON"
    assert len(res.TagSet) == 1


@pytest.mark.anyio
async def test_get_object_attributes_failure_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object",
        side_effect=HTTPException(status_code=404, detail="Not Found"),
    )
    s3api_mock.patch(
        "get_object_tagging",
        return_value=async_return(
            {
                "TagSet": [
                    {
                        "Key": "Key1",
                        "Value": "Value1",
                    },
                ],
            }
        ),
    )
    s3api_mock.patch(
        "get_object_legal_hold",
        return_value=async_return({"LegalHold": {"Status": "ON"}}),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_attributes(
            s3_client, "test01", ObjectRequest(Key="file2.txt")
        )
    assert e.value.status_code == 500


@pytest.mark.anyio
async def test_get_object_attributes_failure_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object",
        return_value=async_return(
            {
                "LastModified": datetime.datetime(
                    2023,
                    8,
                    7,
                    9,
                    45,
                    42,
                ),
                "ContentLength": 129440,
                "ETag": '"080a2712b02867eb6d2340a513d7ced2"',
                "VersionId": "UBMN7vJM52khoX9kJDSEqB2NjeAc.md",
                "ContentType": "image/jpeg",
            }
        ),
    )
    s3api_mock.patch(
        "get_object_tagging",
        side_effect=HTTPException(status_code=404, detail="Not Found"),
    )
    s3api_mock.patch(
        "get_object_legal_hold",
        return_value=async_return({"LegalHold": {"Status": "ON"}}),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_attributes(
            s3_client, "test01", ObjectRequest(Key="file2.txt")
        )
    assert e.value.status_code == 500


@pytest.mark.anyio
async def test_get_object_attributes_failure_3(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "get_object",
        return_value=async_return(
            {
                "LastModified": datetime.datetime(
                    2023,
                    8,
                    7,
                    9,
                    45,
                    42,
                ),
                "ContentLength": 129440,
                "ETag": '"080a2712b02867eb6d2340a513d7ced2"',
                "VersionId": "UBMN7vJM52khoX9kJDSEqB2NjeAc.md",
                "ContentType": "image/jpeg",
            }
        ),
    )
    s3api_mock.patch(
        "get_object_tagging",
        return_value=async_return(
            {
                "TagSet": [
                    {
                        "Key": "Key1",
                        "Value": "Value1",
                    },
                ],
            }
        ),
    )
    s3api_mock.patch(
        "get_object_legal_hold",
        side_effect=HTTPException(status_code=404, detail="Not Found"),
    )

    with pytest.raises(HTTPException) as e:
        await objects.get_object_attributes(
            s3_client, "test01", ObjectRequest(Key="file2.txt")
        )
    assert e.value.status_code == 500


@pytest.mark.anyio
async def test_restore_object(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "copy_object",
        return_value=async_return(
            {
                "CopyObjectResult": {
                    "ETag": '"6805f2cfc46c0f04559748bb039d69ae"',
                    "LastModified": datetime.datetime(
                        2023,
                        8,
                        3,
                        7,
                        38,
                        32,
                        206000,
                    ),
                }
            }
        ),
    )

    res: Object = await objects.restore_object(
        s3_client,
        "test01",
        RestoreObjectRequest(
            Key="a/b/file2.txt", VersionId="F2b5Z0ezvNExjWH3lolr1BUfOn17Zw6"
        ),
    )
    assert res.Name == "file2.txt"
    assert res.Key == "a/b/file2.txt"
    assert res.Type == "OBJECT"
    assert res.LastModified == datetime.datetime(
        2023,
        8,
        3,
        7,
        38,
        32,
        206000,
    )


@pytest.mark.anyio
async def test_restore_object_failure(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "copy_object",
        side_effect=ClientError(
            {},
            "copy_object",
        ),
    )

    with pytest.raises(HTTPException) as e:
        await objects.restore_object(
            s3_client,
            "test01",
            RestoreObjectRequest(
                Key="file2.txt", VersionId="xwLI7f9ZyRlRsgCRq2xF.NameEduiQs"
            ),
        )
    assert e.value.status_code == 500


@pytest.mark.anyio
async def test_delete_object(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "delete_object",
        return_value=async_return(
            {
                "VersionId": "gNRRPXBPWNkRP7U3D-swsXuWvMC2kwA",
                "DeleteMarker": True,
            }
        ),
    )

    res: DeletedObject = await objects.delete_object(
        s3_client,
        "test01",
        DeleteObjectRequest(Key="x/y/file1.md"),
    )
    assert res.Key == "x/y/file1.md"
    assert res.VersionId == "gNRRPXBPWNkRP7U3D-swsXuWvMC2kwA"
    assert res.DeleteMarker is True


@pytest.mark.anyio
async def test_delete_object_by_prefix(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "list_object_versions",
        return_value=async_return(
            {
                "IsTruncated": False,
                "KeyMarker": "",
                "VersionIdMarker": "",
                "Versions": [
                    {
                        "ETag": '"0d6c947604d695f58a4b844c3c0d4233"',
                        "Size": 423,
                        "Key": "file2.txt",
                        "VersionId": "vXrrVkZNXIbprzSpR4hdGt",
                        "IsLatest": False,
                        "LastModified": datetime.datetime(
                            2023,
                            8,
                            7,
                            12,
                            49,
                            30,
                            506000,
                        ),
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
                    },
                    {
                        "ETag": '"d64d9775216d967b6d8d4726d54386ed"',
                        "Size": 1050,
                        "Key": "file3.txt",
                        "VersionId": "HkW2UWxXxASjRRlBhEfEsCL-",
                        "IsLatest": True,
                        "LastModified": datetime.datetime(
                            2022,
                            4,
                            6,
                            2,
                            12,
                            34,
                            643000,
                        ),
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
                    },
                ],
                "DeleteMarkers": [
                    {
                        "Key": "file2.txt",
                        "VersionId": "Drdct2tP8dnfNl2E2DYNv",
                        "IsLatest": True,
                        "LastModified": datetime.datetime(
                            2023,
                            8,
                            7,
                            12,
                            49,
                            19,
                            667000,
                        ),
                        "Owner": {"DisplayName": "M. Tester", "ID": "testid"},
                    },
                ],
                "Name": "test01",
                "Prefix": "",
                "Delimiter": "/",
                "MaxKeys": 1000,
            }
        ),
    )
    s3api_mock.patch(
        "delete_objects",
        return_value=async_return(
            {
                "Deleted": [
                    {
                        "Key": "file3.txt",
                        "VersionId": "HkW2UWxXxASjRRlBhEfEsCL-",
                        "DeleteMarker": True,
                        "DeleteMarkerVersionId": "HkW2UWxXxASjRRlBhEfEsCL-",
                    },
                    {
                        "Key": "file2.txt",
                        "VersionId": "vXrrVkZNXIbprzSpR4hdGt",
                        "DeleteMarker": True,
                        "DeleteMarkerVersionId": "vXrrVkZNXIbprzSpR4hdGt",
                    },
                    {
                        "Key": "file2.txt",
                        "VersionId": "Drdct2tP8dnfNl2E2DYNv",
                        "DeleteMarker": True,
                        "DeleteMarkerVersionId": "Drdct2tP8dnfNl2E2DYNv",
                    },
                ]
            }
        ),
    )

    res: List[DeletedObject] = await objects.delete_object_by_prefix(
        s3_client,
        "test01",
        DeleteObjectByPrefixRequest(Prefix="file", AllVersions=True),
    )
    assert len(res) == 3


@pytest.mark.anyio
async def test_download_object(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    obj_data = {
        "Key": "file2.txt",
        "VersionId": "kOTpzRH08N4TWDlXUz5U9BjZJm85sGV",
        "LastModified": "2023-08-07T09:01:14+00:00",
        "ETag": '"75ec5355d8c2c299d9ff530edbb248fc"',
        "ContentLength": 14,
        "Body": "This is a test",
        "ContentType": "text/plain",
    }

    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "head_object",
        return_value=async_return(obj_data),
    )
    s3api_mock.patch(
        "get_object",
        return_value=async_return(obj_data),
    )

    res: StreamingResponse = await objects.download_object(
        s3_client,
        "test01",
        ObjectRequest(Key="file2.txt"),
    )
    assert isinstance(res, StreamingResponse)
    assert res.media_type == "text/plain"
    assert res.headers.get("content-length") == "14"
    assert res.headers.get("etag") == '"75ec5355d8c2c299d9ff530edbb248fc"'


@pytest.mark.anyio
async def test_upload_object(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch("upload_fileobj")

    await objects.upload_object(
        s3_client,
        "test01",
        "file2.txt",
        UploadFile(file=io.BytesIO(), filename="file2.txt"),
    )
    s3api_mock.mocked_fn["upload_fileobj"].assert_called()
