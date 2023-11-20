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
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from backend.api import S3GWClient, decode_client_error, s3gw_client
from backend.config import S3AddressingStyle
from backend.tests.unit.helpers import ConfigMock


@pytest.mark.anyio
async def test_s3gw_conn_malformed_creds() -> None:
    url = "https://foo.bar:123"
    bad_creds = [
        "foo",
        "foo@bar",
        ":bar",
        "foo:",
        "foo : bar",
        ": bar",
        " ",
        "",
        "foo :",
    ]

    for creds in bad_creds:
        error_found = False
        try:
            await s3gw_client(ConfigMock(url), creds)
        except HTTPException as e:
            assert e.status_code == status.HTTP_401_UNAUTHORIZED
            error_found = True
        if not error_found:
            print(f"test failed at '{creds}'")
        assert error_found


@pytest.mark.anyio
async def test_s3gw_conn_success() -> None:
    url = "https://foo.bar:123"
    creds = "foo:bar"

    client = await s3gw_client(ConfigMock(url), creds)
    assert client is not None


@pytest.mark.anyio
async def test_s3gw_client_bad_endpoint() -> None:
    s3gw_client = S3GWClient(ConfigMock("http://foo.bar"), "asd", "qwe")

    with pytest.raises(HTTPException) as e:
        async with s3gw_client.conn() as client:
            await client.list_buckets()
    assert e.value.status_code == status.HTTP_502_BAD_GATEWAY


@pytest.mark.anyio
async def test_s3gw_client_addressing_style() -> None:
    s3gw_client = S3GWClient(
        ConfigMock("https://abc.xyz", S3AddressingStyle.PATH), "foo", "bar"
    )
    assert S3AddressingStyle.PATH.value == s3gw_client.addressing_style


@pytest.mark.anyio
async def test_s3server(s3_server: str) -> None:
    s3gw_client = S3GWClient(ConfigMock(s3_server), "foo", "bar")
    async with s3gw_client.conn() as client:
        lst = await client.list_buckets()
        assert "Buckets" in lst
        assert len(lst["Buckets"]) == 0
        await client.create_bucket(Bucket="foo")
        lst = await client.list_buckets()
        assert "Buckets" in lst
        assert len(lst["Buckets"]) == 1
        buckets = [x["Name"] for x in lst["Buckets"]]
        assert "foo" in buckets
        await client.delete_bucket(Bucket="foo")


def test_decode_client_error_1() -> None:
    error = ClientError(
        error_response={
            "Error": {"Code": "InvalidAccessKeyId", "Message": "foo bar"},
            "ResponseMetadata": {  # pyright: ignore [reportGeneralTypeIssues]
                "HTTPStatusCode": 401
            },
        },
        operation_name="TestOperation",
    )
    (status_code, detail) = decode_client_error(error)
    assert status_code == status.HTTP_401_UNAUTHORIZED
    assert detail == "Foo bar"


def test_decode_client_error_2() -> None:
    error = ClientError(error_response={}, operation_name="TestOperation2")
    (status_code, detail) = decode_client_error(error)
    assert status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert detail == "Unknown error"


def test_decode_client_error_3() -> None:
    error = ClientError(
        error_response={
            "Error": {
                "Code": "403",
                "Message": "foo bar",
            },  # pyright: ignore [reportGeneralTypeIssues]
        },
        operation_name="TestOperation",
    )
    (status_code, detail) = decode_client_error(error)
    assert status_code == status.HTTP_403_FORBIDDEN
    assert detail == "Foo bar"


def test_decode_client_error_4() -> None:
    error = ClientError(
        error_response={
            "Error": {"Code": "InvalidAccessKeyId"},
            "ResponseMetadata": {  # pyright: ignore [reportGeneralTypeIssues]
                "HTTPStatusCode": 403
            },
        },
        operation_name="TestOperation",
    )
    (status_code, detail) = decode_client_error(error)
    assert status_code == status.HTTP_403_FORBIDDEN
    assert detail == "Invalid access key"


def test_decode_client_error_5() -> None:
    error = ClientError(
        error_response={
            "Error": {
                "BucketName": "e2ebucket",
                "Code": "BucketNotEmpty",
                "Message": None,  # pyright: ignore [reportGeneralTypeIssues]
            },
            "ResponseMetadata": {  # pyright: ignore [reportGeneralTypeIssues]
                "HTTPStatusCode": 409
            },
        },
        operation_name="TestOperation",
    )
    (status_code, detail) = decode_client_error(error)
    assert status_code == status.HTTP_409_CONFLICT
    assert detail == "Bucket not empty"
