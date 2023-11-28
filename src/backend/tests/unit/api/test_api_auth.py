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
from botocore.exceptions import EndpointConnectionError
from fastapi import HTTPException, status
from httpx import ConnectError
from pytest_httpx import HTTPXMock
from pytest_mock import MockerFixture

from backend.admin_ops.types import UserInfo
from backend.api import S3GWClient, auth
from backend.api.types import AuthUser
from backend.tests.unit.helpers import S3ApiMock, async_return


@pytest.mark.anyio
async def test_authenticate_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.get_user_info")
    p.return_value = UserInfo.parse_obj(
        {
            "tenant": "",
            "user_id": "testid",
            "display_name": "M. Tester",
            "email": "tester@ceph.com",
            "suspended": False,
            "max_buckets": 1000,
            "subusers": [],
            "keys": [
                {"user": "testid", "access_key": "test", "secret_key": "test"}
            ],
            "caps": [],
            "op_mask": "read, write, delete",
            "system": False,
            "admin": True,
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
            "stats": None,
        }
    )

    res: AuthUser = await auth.authenticate(s3_client)
    assert res.ID == "testid"
    assert res.DisplayName == "M. Tester"
    assert res.IsAdmin is True


@pytest.mark.anyio
async def test_authenticate_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.get_user_info")
    p.side_effect = HTTPException(404)

    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "list_buckets",
        return_value=async_return(
            {"Owner": {"ID": "ffuzz", "DisplayName": "Foo Fuzz"}}
        ),
    )

    res: AuthUser = await auth.authenticate(s3_client)
    assert res.ID == "ffuzz"
    assert res.DisplayName == "Foo Fuzz"
    assert res.IsAdmin is False


@pytest.mark.anyio
async def test_authenticate_3(
    s3_client: S3GWClient, mocker: MockerFixture, httpx_mock: HTTPXMock
) -> None:
    httpx_mock.add_response(  # pyright: ignore [reportUnknownMemberType]
        status_code=404, json={"Code": "NoSuchUser"}
    )

    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "list_buckets",
        side_effect=Exception,
    )

    with pytest.raises(HTTPException) as e:
        await auth.authenticate(s3_client)
    assert e.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.anyio
async def test_authenticate_4(
    s3_client: S3GWClient, mocker: MockerFixture, httpx_mock: HTTPXMock
) -> None:
    httpx_mock.add_exception(
        exception=ConnectError(message="All connection attempts failed")
    )

    s3api_mock = S3ApiMock(s3_client, mocker)
    s3api_mock.patch(
        "list_buckets",
        side_effect=EndpointConnectionError(
            endpoint_url="http://127.0.0.1:7481/"
        ),
    )

    with pytest.raises(HTTPException) as e:
        await auth.authenticate(s3_client)
    assert e.value.status_code == status.HTTP_502_BAD_GATEWAY
