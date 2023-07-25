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

# pyright: reportPrivateUsage=false

from typing import Any, Dict, List

import httpx
import pytest
from pytest_httpx import HTTPXMock
from pytest_mock import MockerFixture

from backend.admin_ops.types import (
    UserInfo,
    UserKeyOpParams,
    UserKeys,
    UserOpParams,
    UserQuotaOpParams,
)
from backend.admin_ops.users import (
    create,
    create_key,
    delete,
    delete_key,
    get_keys,
    get_user_info,
    list_uids,
    list_users,
    quota_update,
    update,
)
from backend.s3gw.errors import S3GWError

res_user_info_json = {
    "tenant": "",
    "user_id": "testid",
    "display_name": "M. Tester",
    "email": "tester@ceph.com",
    "suspended": 0,
    "max_buckets": 1000,
    "subusers": [],
    "keys": [{"user": "testid", "access_key": "test", "secret_key": "test"}],
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


@pytest.mark.anyio
async def test_get_user_info(httpx_mock: HTTPXMock) -> None:
    httpx_mock.add_response(  # pyright: ignore [reportUnknownMemberType]
        json=res_user_info_json,
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
    except S3GWError:
        raised = True

    assert raised


@pytest.mark.anyio
async def test_list_uids(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/metadata/user"
        assert method == "GET"
        assert params is None
        return httpx.Response(status_code=200, json=["foo", "bar"])

    mocker.patch("backend.admin_ops.users.do_request", new=_mock_do_request)
    res = await list_uids("http://fail.tld", access_key="asd", secret_key="qwe")
    assert isinstance(res, list)
    assert len(res) == 2
    assert "foo" in res
    assert "bar" in res


@pytest.mark.anyio
async def test_list_users(mocker: MockerFixture) -> None:
    async def _mock_get_user_info(
        url: str,
        access_key: str,
        secret_key: str,
        uid: str,
        with_statistics: bool,
    ) -> UserInfo:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert uid is not None and len(uid) > 0
        assert not with_statistics
        info = UserInfo.parse_obj(res_user_info_json)
        info.user_id = uid
        info.display_name = f"{uid} name"
        info.email = f"{uid}@fail.tld"
        return info

    async def _mock_list_uids(
        url: str, access_key: str, secret_key: str
    ) -> List[str]:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        return ["foo", "bar"]

    mocker.patch("backend.admin_ops.users.list_uids", new=_mock_list_uids)
    mocker.patch(
        "backend.admin_ops.users.get_user_info", new=_mock_get_user_info
    )

    res = await list_users(
        "http://fail.tld",
        access_key="asd",
        secret_key="qwe",
        with_statistics=False,
    )
    assert isinstance(res, list)
    assert len(res) == 2
    found_foo = False
    found_bar = False
    for entry in res:
        if entry.user_id == "foo":
            assert entry.email == "foo@fail.tld"
            assert entry.display_name == "foo name"
            found_foo = True
        elif entry.user_id == "bar":
            assert entry.email == "bar@fail.tld"
            assert entry.display_name == "bar name"
            found_bar = True
        else:
            assert False

    assert found_foo
    assert found_bar


@pytest.mark.anyio
async def test_create_user(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/user"
        assert method == "PUT"
        assert params is not None

        assert "uid" in params and params["uid"] == "foo"
        assert "display-name" in params and params["display-name"] == "Foo"
        assert "key-type" in params and params["key-type"] == "s3"

        info = UserInfo.parse_obj(res_user_info_json)
        info.user_id = "foo"
        info.display_name = "Foo"
        return httpx.Response(status_code=200, json=info.dict())

    mocker.patch("backend.admin_ops.users.do_request", new=_mock_do_request)
    res = await create(
        "http://fail.tld",
        access_key="asd",
        secret_key="qwe",
        user=UserOpParams(
            uid="foo",
            display_name="Foo",
        ),
    )
    assert res.user_id == "foo"
    assert res.display_name == "Foo"


@pytest.mark.anyio
async def test_delete_user(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/user"
        assert method == "DELETE"
        assert params is not None
        assert "uid" in params and params["uid"] == "foo"
        return httpx.Response(status_code=200)

    mocker.patch("backend.admin_ops.users.do_request", _mock_do_request)
    await delete(
        "http://fail.tld",
        access_key="asd",
        secret_key="qwe",
        uid="foo",
    )


@pytest.mark.anyio
async def test_update_user(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/user"
        assert method == "POST"
        assert params is not None
        assert "uid" in params and params["uid"] == "foo"
        assert "email" in params and params["email"] == "foo@fail.tld"

        info = UserInfo.parse_obj(res_user_info_json)
        info.user_id = "foo"
        info.email = "foo@fail.tld"

        return httpx.Response(
            status_code=200,
            json=info.dict(),
        )

    mocker.patch("backend.admin_ops.users.do_request", _mock_do_request)
    res = await update(
        "http://fail.tld",
        access_key="asd",
        secret_key="qwe",
        user=UserOpParams(
            uid="foo",
            email="foo@fail.tld",
        ),
    )
    assert res.user_id == "foo"
    assert res.email == "foo@fail.tld"


@pytest.mark.anyio
async def test_create_key(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/user?key"
        assert method == "PUT"
        assert params is not None
        assert "uid" in params and params["uid"] == "foo"
        assert "generate-key" in params and params["generate-key"] is True

        return httpx.Response(
            status_code=200,
            json=[
                UserKeys(
                    user="foo", access_key="asdasd", secret_key="qweqwe"
                ).dict(),
            ],
        )

    mocker.patch("backend.admin_ops.users.do_request", _mock_do_request)
    res = await create_key(
        "http://fail.tld",
        access_key="asd",
        secret_key="qwe",
        key_params=UserKeyOpParams(
            uid="foo",
            generate_key=True,
        ),
    )
    assert len(res) == 1
    assert res[0].user == "foo"
    assert res[0].access_key == "asdasd"
    assert res[0].secret_key == "qweqwe"


@pytest.mark.anyio
async def test_get_user_keys(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/user"
        assert method == "GET"
        assert params is not None
        assert "uid" in params and params["uid"] == "foo"

        info = UserInfo.parse_obj(res_user_info_json)
        info.user_id = "foo"
        info.keys = [
            UserKeys(user="foo", access_key="asdasd", secret_key="qweqwe")
        ]
        return httpx.Response(
            status_code=200,
            json=info.dict(),
        )

    mocker.patch("backend.admin_ops.users.do_request", _mock_do_request)
    res = await get_keys(
        "http://fail.tld", access_key="asd", secret_key="qwe", uid="foo"
    )
    assert len(res) == 1
    assert res[0].user == "foo"
    assert res[0].access_key == "asdasd"
    assert res[0].secret_key == "qweqwe"


@pytest.mark.anyio
async def test_delete_user_key(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/user?key"
        assert method == "DELETE"
        assert params is not None
        assert "uid" in params and params["uid"] == "foo"
        assert "access-key" in params and params["access-key"] == "asdasd"
        return httpx.Response(status_code=200)

    mocker.patch("backend.admin_ops.users.do_request", _mock_do_request)
    await delete_key(
        "http://fail.tld",
        access_key="asd",
        secret_key="qwe",
        uid="foo",
        user_access_key="asdasd",
    )


@pytest.mark.anyio
async def test_quota_update(mocker: MockerFixture) -> None:
    async def _mock_do_request(
        *,
        url: str,
        access_key: str,
        secret_key: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any] | None = None,
    ) -> httpx.Response:
        assert url == "http://fail.tld"
        assert access_key == "asd"
        assert secret_key == "qwe"
        assert endpoint == "/admin/user?quota"
        assert method == "PUT"
        assert params is not None
        assert "uid" in params and params["uid"] == "foo"
        assert "quota-type" in params and params["quota-type"] == "user"
        assert "max-objects" in params and params["max-objects"] == 1337
        assert "enabled" in params and params["enabled"] is True
        return httpx.Response(status_code=200)

    mocker.patch("backend.admin_ops.users.do_request", _mock_do_request)
    await quota_update(
        "http://fail.tld",
        access_key="asd",
        secret_key="qwe",
        uid="foo",
        quota=UserQuotaOpParams(
            quota_type="user",
            max_objects=1337,
            enabled=True,
        ),
    )
