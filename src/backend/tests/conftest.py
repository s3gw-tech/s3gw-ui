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
from typing import AsyncGenerator

import pytest

from backend.api import S3GWClient
from backend.tests.mock_server import MotoService

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
