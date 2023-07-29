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

import logging
import os
from typing import Any, AsyncGenerator

import pytest
from fastapi import status
from pytest_mock import MockerFixture

from backend.admin_ops.types import Bucket as AdminOpsBucket
from backend.admin_ops.types import QuotaInfo
from backend.api import S3GWClient
from backend.s3gw.errors import S3GWError
from backend.tests.unit.moto_server import MotoService

if os.environ.get("S3GW_TEST_DEBUG") is not None:
    logging.basicConfig(level=logging.DEBUG)


class S3ServerEndpoint:
    url: str
    is_mock: bool

    def __init__(self, url: str, is_mock: bool) -> None:
        self.url = url
        self.is_mock = is_mock


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def is_mock_server() -> bool:
    srv = os.getenv("S3GW_TEST_ENDPOINT")
    return not (srv is not None and len(srv) > 0 and srv.startswith("http"))


@pytest.fixture
async def s3_server() -> AsyncGenerator[str, None]:
    async with MotoService("s3") as svc:
        yield svc.endpoint_url


@pytest.fixture
async def s3_client(s3_server: str) -> AsyncGenerator[S3GWClient, None]:
    srv = os.getenv("S3GW_TEST_ENDPOINT", s3_server)
    access = os.getenv("S3GW_TEST_ACCESS_KEY", "foo")
    secret = os.getenv("S3GW_TEST_SECRET_KEY", "bar")

    logging.debug(f"server: {srv}, access_key: {access}, secret_key: {secret}")

    assert srv is not None and len(srv) > 0
    assert srv.startswith("http")
    assert access is not None and len(access) > 0
    assert secret is not None and len(secret) > 0
    yield S3GWClient(srv, access, secret)


@pytest.fixture
async def mock_get_bucket(
    s3_client: S3GWClient, mocker: MockerFixture
) -> AsyncGenerator[None, Any]:
    async def _mock_get_bucket(
        url: str, access_key: str, secret_key: str, bucket_name: str
    ) -> AdminOpsBucket:
        print(f"obtain mock bucket: {bucket_name}")
        async with s3_client.conn() as client:
            lst = await client.list_buckets()
            if "Buckets" not in lst:
                raise S3GWError(status.HTTP_500_INTERNAL_SERVER_ERROR)
            buckets = lst["Buckets"]
            for b in buckets:
                if "Name" not in b:
                    print(f"WHAT: {b}")
                    print(f"WHAT: {buckets}")
                    assert False

                if b["Name"] == bucket_name:
                    assert "CreationDate" in b
                    ctime = b["CreationDate"]
                    ret = AdminOpsBucket(
                        id="asd",
                        bucket=bucket_name,
                        owner="asd",
                        marker="asd",
                        index_type="asd",
                        ver="asd",
                        master_ver="asd",
                        mtime=ctime,
                        creation_time=ctime,
                        max_marker="asd",
                        usage=None,
                        bucket_quota=QuotaInfo(
                            enabled=False,
                            check_on_raw=False,
                            max_size=1000,
                            max_size_kb=1000,
                            max_objects=1000,
                        ),
                    )
                    print(f"ret bucket: {ret}")
                    return ret

            raise S3GWError(status.HTTP_404_NOT_FOUND)

    mocker.patch("backend.admin_ops.buckets.get_bucket", new=_mock_get_bucket)
    yield
