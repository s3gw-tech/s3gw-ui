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
from fastapi import HTTPException, Response
from pytest_mock import MockerFixture

from backend.api import S3GWClient, admin


@pytest.mark.anyio
async def test_admin_ops_user_exists(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.list_uids")
    await admin.user_exists(s3_client, "foo")
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_get_user(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.get_user_info")
    await admin.get_user(s3_client, "foo", stats=True)
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_create_user(
    s3_client: S3GWClient, response: Response, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.create")
    await admin.create_user(
        s3_client, response, "foo", "bar", "baz@fail.tld", False, 1000, True
    )
    p.assert_called_once()
    assert "location" in response.headers


@pytest.mark.anyio
async def test_admin_ops_update_user(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.update")
    await admin.update_user(s3_client, "foo", "B. Foo")
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_delete_user(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.delete")
    p.return_value = "foo"
    res = await admin.delete_user(s3_client, "foo")
    p.assert_called_once()
    assert res == "foo"


@pytest.mark.anyio
async def test_admin_ops_list_users_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.list_uids")
    await admin.list_users(s3_client)
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_list_users_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.list_users")
    await admin.list_users(s3_client, True)
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_create_user_key(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.create_key")
    await admin.create_user_key(s3_client, "foo", True)
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_get_user_keys(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.get_keys")
    await admin.get_user_keys(s3_client, "foo")
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_delete_user_key(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.delete_key")
    p.return_value = {"user": "foo", "access_key": "0815xyz4815162342"}
    res = await admin.delete_user_key(s3_client, "foo", "0815xyz4815162342")
    p.assert_called_once()
    assert dict(res)["user"] == "foo"
    assert dict(res)["access_key"] == "0815xyz4815162342"


@pytest.mark.anyio
async def test_admin_ops_update_user_quota(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.quota_update")
    await admin.update_user_quota(s3_client, "foo", 1000, 1000, True)
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_list_user_buckets(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.list_buckets")
    await admin.list_user_buckets(s3_client, "foo")
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_get_user_usage_stats(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.get_usage_stats")
    await admin.get_user_usage_stats(s3_client, "foo")
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_get_bucket_info(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.get_bucket_info")
    await admin.get_bucket_info(s3_client, "foo")
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_bucket_exists_1(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.get_bucket_info")
    res = await admin.bucket_exists(s3_client, "foo")
    p.assert_called_once()
    assert res.status_code == 200


@pytest.mark.anyio
async def test_admin_ops_bucket_exists_2(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.get_bucket_info")
    p.side_effect = HTTPException(404)
    with pytest.raises(HTTPException) as e:
        await admin.bucket_exists(s3_client, "foo")
    assert e.value.status_code == 404


@pytest.mark.anyio
async def test_admin_ops_list_buckets(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.list_buckets")
    await admin.list_buckets(s3_client)
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_delete_bucket(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.delete_bucket")
    p.return_value = "bar"
    res = await admin.delete_bucket(s3_client, "bar", True)
    p.assert_called_once()
    assert res == "bar"


@pytest.mark.anyio
async def test_admin_ops_link_bucket(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.link_bucket")
    await admin.link_bucket(s3_client, "bucket01", "dev.6607669.420", "user01")
    p.assert_called_once()
