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
from fastapi import Request
from pytest_mock import MockerFixture

from backend.api import config as api_config
from backend.config import Config


@pytest.mark.anyio
async def test_get_config(mocker: MockerFixture) -> None:
    class MockState:
        config: Config

    class MockApp:
        state: MockState

    p = mocker.patch("backend.config.get_s3gw_address")
    p.return_value = "http://foo.bar:123"

    test_config = Config()

    req = Request({"type": "http", "app": MockApp()})
    req.app.state = MockState()
    req.app.state.config = test_config
    res = await api_config.get_config(req)
    assert isinstance(res, api_config.ConfigResponse)
    assert res.Endpoint == "http://foo.bar:123"
