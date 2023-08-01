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
from pytest_mock import MockerFixture

from backend.api import S3GWClient, admin


@pytest.mark.anyio
async def test_admin_ops_users(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.users.get_user_info")
    await admin.get_user(s3_client, "foo", stats=True)
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.create")
    await admin.create_user(
        s3_client, "foo", "bar", "baz@fail.tld", False, 1000, True
    )
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.delete")
    await admin.delete_user(s3_client, "foo")
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.get_auth_user")
    await admin.authenticate_user(s3_client)
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.list_uids")
    await admin.list_users(s3_client)
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.create_key")
    await admin.create_user_key(s3_client, "foo", True)
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.get_keys")
    await admin.get_user_keys(s3_client, "foo")
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.delete_key")
    await admin.delete_user_key(s3_client, "foo", "bar")
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.users.quota_update")
    await admin.update_user_quota(s3_client, "foo", 1000, 1000, True)
    p.assert_called_once()

    p = mocker.patch("backend.admin_ops.buckets.list_buckets")
    await admin.list_user_buckets(s3_client, "foo")
    p.assert_called_once()


@pytest.mark.anyio
async def test_admin_ops_buckets(
    s3_client: S3GWClient, mocker: MockerFixture
) -> None:
    p = mocker.patch("backend.admin_ops.buckets.get_bucket")
    await admin.bucket_info(s3_client, "foo")
    p.assert_called_once()
