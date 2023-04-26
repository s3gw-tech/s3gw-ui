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
import json

import httpx
from pytest_mock import MockerFixture

from backend.admin_ops.errors import error_from_response


def test_error_from_response_1() -> None:
    res = httpx.Response(status_code=400, json={"Code": "InvalidBucketName"})
    e = error_from_response(res)
    assert e.status_code == 400
    assert e.detail == "Invalid bucket name"


def test_error_from_response_2() -> None:
    res = httpx.Response(status_code=403, json={})
    e = error_from_response(res)
    assert e.status_code == 403
    assert e.detail == "Unknown error"


def test_error_from_response_3(mocker: MockerFixture) -> None:
    p = mocker.patch(
        "httpx.Response.json",
        side_effect=json.JSONDecodeError("msg", "doc", 1234),
    )
    res = httpx.Response(status_code=411, json={"foo": 1})
    e = error_from_response(res)
    assert e.status_code == 411
    assert e.detail == "Unknown error"
    p.assert_called_once()
