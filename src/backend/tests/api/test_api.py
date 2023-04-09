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


@pytest.mark.asyncio
async def test_s3gw_conn_malformed_url() -> None:
    creds = "foo:bar"
    bad_urls = [
        "something://foo.bar:123",
        "http:/foo.bar:123",
        "http//foo.bar:123",
        "httpp://foo.bar:123",
        "https://foo+bar:123",
        "https://foo.bar:123a",
    ]

    for url in bad_urls:
        error_found = False
        try:
            await s3gw_client(url, creds)
        except HTTPException as e:
            assert e.status_code == status.HTTP_400_BAD_REQUEST
            error_found = True
        if not error_found:
            print(f"test failed at '{url}'")
        assert error_found


@pytest.mark.asyncio
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
            await s3gw_client(url, creds)
        except HTTPException as e:
            assert e.status_code == status.HTTP_401_UNAUTHORIZED
            error_found = True
        if not error_found:
            print(f"test failed at '{creds}'")
        assert error_found


@pytest.mark.asyncio
async def test_s3gw_conn_success() -> None:
    url = "https://foo.bar:123"
    creds = "foo:bar"

    client = await s3gw_client(url, creds)
    assert client is not None


@pytest.mark.asyncio
async def test_s3gw_client_bad_endpoint() -> None:
    s3gw_client = S3GWClient("http://foo.bar", "asd", "qwe")

    raised = False
    try:
        async with s3gw_client.conn() as client:
            await client.list_buckets()
    except HTTPException as e:
        assert e.status_code == status.HTTP_502_BAD_GATEWAY
        raised = True

    assert raised


@pytest.mark.asyncio
async def test_s3server(s3_server: str) -> None:
    s3gw_client = S3GWClient(s3_server, "foo", "bar")
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


def test_decode_client_error() -> None:
    error = ClientError(
        error_response={
            "Error": {"Code": "InvalidAccessKeyId", "Message": "foo bar"}
        },
        operation_name="TestOperation",
    )
    (code, msg) = decode_client_error(error)
    assert code == status.HTTP_401_UNAUTHORIZED
    assert msg == "Invalid credentials"

    error = ClientError(error_response={}, operation_name="TestOperation2")
    (code, msg) = decode_client_error(error)
    assert code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert msg == "Unknown Error"
