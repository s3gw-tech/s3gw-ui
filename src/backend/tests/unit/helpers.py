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

import asyncio
import contextlib
from typing import Any, Dict, List

from pytest_mock import MockerFixture
from pytest_mock.plugin import MockType

from backend.api import S3GWClient
from backend.config import Config, S3AddressingStyle


def async_return(result: Any):
    f: asyncio.Future[Any] = asyncio.Future()
    f.set_result(result)
    return f


class S3ApiMock:
    def __init__(self, client: S3GWClient, mocker: MockerFixture):
        self.mocked_fn: Dict[str, MockType] = {}
        self._patch_args: List[Dict[str, Any]] = []
        self._client = client
        self._mocker = mocker
        self._orig_conn = client.conn
        self._mocker.patch.object(client, "conn", self.conn)

    def patch(self, name: str, **kwargs: Any):
        """
        :name: The name of the S3 API function to patch.
        """
        self._patch_args.append({"attribute": name, **kwargs})

    @contextlib.asynccontextmanager
    async def conn(self):
        async with self._orig_conn() as s3:
            for patch_args in self._patch_args:
                self.mocked_fn[
                    patch_args["attribute"]
                ] = self._mocker.patch.object(s3, **patch_args)
            yield s3


class ConfigMock(Config):
    def __init__(
        self, s3gw_addr: str, s3_addressing_style: S3AddressingStyle = "auto"
    ) -> None:  # noqa
        self._s3gw_addr = s3gw_addr
        self._s3_addressing_style = s3_addressing_style
