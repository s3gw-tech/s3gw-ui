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
from pytest_httpx import HTTPXMock

from backend.admin_ops.types import AdminOpsError, UserInfo
from backend.admin_ops.users import get_user_info


@pytest.mark.anyio
async def test_get_user_info(httpx_mock: HTTPXMock) -> None:
    res_json = {
        "tenant": "",
        "user_id": "testid",
        "display_name": "M. Tester",
        "email": "tester@ceph.com",
        "suspended": 0,
        "max_buckets": 1000,
        "subusers": [],
        "keys": [
            {"user": "testid", "access_key": "test", "secret_key": "test"}
        ],
        "swift_keys": [],
        "caps": [],
        "op_mask": "read, write, delete",
        "system": False,
        "admin": True,
        "default_placement": "",
        "default_storage_class": "",
        "placement_tags": [],
        "bucket_quota": {
            "enabled": False,
            "check_on_raw": False,
            "max_size": -1,
            "max_size_kb": 0,
            "max_objects": -1,
        },
        "user_quota": {
            "enabled": False,
            "check_on_raw": False,
            "max_size": -1,
            "max_size_kb": 0,
            "max_objects": -1,
        },
        "temp_url_keys": [],
        "type": "rgw",
        "mfa_ids": [],
    }

    httpx_mock.add_response(  # pyright: ignore [reportUnknownMemberType]
        json=res_json,
    )

    res: UserInfo = await get_user_info(
        url="http://foo.bar:123", access_key="asd", secret_key="qwe"
    )
    assert res.user_id == "testid"
    assert res.admin


@pytest.mark.anyio
async def test_get_user_info_failure(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(  # pyright: ignore [reportUnknownMemberType]
        status_code=404,  # any error, really
    )

    raised = False
    try:
        await get_user_info(
            url="http://foo.bar:123", access_key="asd", secret_key="qwe"
        )
    except AdminOpsError:
        raised = True

    assert raised
