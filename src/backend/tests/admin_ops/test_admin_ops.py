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

import re

import httpx
import pytest

from backend.admin_ops import signed_request


@pytest.mark.anyio
async def test_signed_request() -> None:
    authorization_regex = re.compile(r"^[ ]*AWS[ ]+(\w+):([\w_/=+]+)")

    req1: httpx.Request = signed_request(
        access="test",
        secret="test",
        method="GET",
        url="http://foo.bar:123",
        data=None,
        params=None,
        headers=None,
    )
    assert "Authorization" in req1.headers
    m1 = re.fullmatch(authorization_regex, req1.headers["Authorization"])
    assert m1 is not None
    assert len(m1.groups()) == 2
    assert m1.group(1) == "test"
    assert len(m1.group(2)) > 0

    req2: httpx.Request = signed_request(
        access="test",
        secret="test",
        method="POST",
        url="http://foo.bar:123",
        data=None,
        params=None,
        headers=None,
    )
    assert "Authorization" in req2.headers
    m2 = re.fullmatch(authorization_regex, req2.headers["Authorization"])
    print(req2.headers["Authorization"])
    assert m2 is not None
    assert len(m2.groups()) == 2
    assert m2.group(1) == "test"
    assert len(m2.group(2)) > 0
    assert m2.group(2) != m1.group(2)

    req3: httpx.Request = signed_request(
        access="test",
        secret="test",
        method="GET",
        url="http://foo.bar:123/?param1=baz",
        data=None,
        params=None,
        headers=None,
    )
    assert "Authorization" in req3.headers
    m3 = re.fullmatch(authorization_regex, req3.headers["Authorization"])
    assert m3 is not None
    assert len(m3.groups()) == 2
    assert m3.group(1) == "test"
    assert len(m3.group(2)) > 0
    assert m3.group(2) != m1.group(2)
    assert m3.group(2) != m2.group(2)
    assert str(req3.url.query).find("param1=baz") >= 0


from backend.api import S3GWClient, admin


@pytest.fixture(autouse=True)
async def run_before_and_after_tests(s3_client: S3GWClient):
    """Fixture to execute asserts before and after a test is run"""
    # Setup: fill with any logic you want
    print("---> Setup")

    yield  # this is where the testing happens

    # Teardown : fill with any logic you want
    print("<--- Teardown")
    try:
        await admin.delete_user(s3_client, uid="usr1")
    except:
        pass
    try:
        await admin.delete_user(s3_client, uid="usr2")
    except:
        pass
    try:
        await admin.delete_user(s3_client, uid="usr3")
    except:
        pass


@pytest.mark.anyio
async def test_create_user(s3_client: S3GWClient) -> None:
    res = await admin.create_user(
        s3_client,
        uid="usr1",
        display_name="usr1Name",
        email="usr1@email",
        key_type="s3",
        access_key="usr1",
        secret_key="usr1",
        user_caps="",
        generate_key=False,
        max_buckets=101,
        suspended=False,
        tenant="",
    )
    assert res.user_id == "usr1"
    assert res.display_name == "usr1Name"
    assert res.email == "usr1@email"
    assert res.max_buckets == 101
    assert res.suspended == False
    assert res.tenant == ""


@pytest.mark.anyio
async def test_get_user_info(s3_client: S3GWClient) -> None:
    res = await admin.create_user(
        s3_client,
        uid="usr2",
        display_name="usr2Name",
        email="usr2@email",
        key_type="s3",
        access_key="usr2",
        secret_key="usr2",
        user_caps="",
        generate_key=False,
        max_buckets=103,
        suspended=False,
        tenant="",
    )
    assert res.user_id == "usr2"
    res = await admin.get_user_info(
        s3_client, uid="usr2", with_statistics=False
    )
    assert res.user_id == "usr2"
    assert res.display_name == "usr2Name"
    assert res.email == "usr2@email"
    assert res.max_buckets == 103
    assert res.suspended == False
    assert res.tenant == ""


@pytest.mark.anyio
async def test_delete_user(s3_client: S3GWClient) -> None:
    res = await admin.create_user(
        s3_client,
        uid="usr3",
        display_name="usr3Name",
        email="usr3@email",
        key_type="s3",
        access_key="usr3",
        secret_key="usr3",
        user_caps="",
        generate_key=False,
        max_buckets=105,
        suspended=False,
        tenant="",
    )
    assert res.user_id == "usr3"
    await admin.delete_user(s3_client, uid="usr3")
