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
import uuid
from typing import List

import httpx
import pytest

from backend.admin_ops import signed_request
from backend.api import S3GWClient, admin, bucket

created_buckets: List[str] = []
created_users: List[str] = []


@pytest.fixture(autouse=True)
async def run_before_and_after_tests(s3_client: S3GWClient):
    global created_buckets

    """Fixture to execute asserts before and after a test is run"""
    # Setup: fill with any logic you want
    print("---> Setup")

    yield  # this is where the testing happens

    # Teardown : fill with any logic you want
    print("<--- Teardown")
    async with s3_client.conn() as client:
        for bucket_name in created_buckets:
            try:
                await client.delete_bucket(Bucket=bucket_name)
            except:
                pass
        created_buckets.clear()

        for uid in created_users:
            try:
                await admin.delete_user(s3_client, uid=uid)
            except:
                pass
        created_users.clear()


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


@pytest.mark.anyio
async def test_create_user(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    res = await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        key_type="s3",
        access_key=str(uid1),
        secret_key=str(uid1),
        user_caps="",
        generate_key=False,
        max_buckets=101,
        suspended=False,
        tenant="",
    )
    assert res.user_id == str(uid1)
    assert res.display_name == "DN" + str(uid1)
    assert res.email == str(uid1) + "@email"
    assert res.max_buckets == 101
    assert res.suspended == False
    assert res.tenant == ""


@pytest.mark.anyio
async def test_get_user_info(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    res = await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        key_type="s3",
        access_key=str(uid1),
        secret_key=str(uid1),
        user_caps="",
        generate_key=False,
        max_buckets=103,
        suspended=False,
        tenant="",
    )
    assert res.user_id == str(uid1)
    res = await admin.get_user_info(
        s3_client, uid=str(uid1), with_statistics=False
    )
    assert res.user_id == str(uid1)
    assert res.display_name == "DN" + str(uid1)
    assert res.email == str(uid1) + "@email"
    assert res.max_buckets == 103
    assert res.suspended == False
    assert res.tenant == ""


@pytest.mark.anyio
async def test_delete_user(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    res = await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        key_type="s3",
        access_key=str(uid1),
        secret_key=str(uid1),
        user_caps="",
        generate_key=False,
        max_buckets=105,
        suspended=False,
        tenant="",
    )
    assert res.user_id == str(uid1)
    await admin.delete_user(s3_client, uid=str(uid1))


@pytest.mark.anyio
async def test_get_auth_user(s3_client: S3GWClient) -> None:
    res = await admin.get_auth_user(s3_client)
    assert res.user_id == "testid"
    assert res.display_name == "M. Tester"
    assert res.is_admin == True


@pytest.mark.anyio
async def test_list_uids(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    uid2 = uuid.uuid4()
    created_users.append(str(uid1))
    created_users.append(str(uid2))

    await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        key_type="s3",
        access_key=str(uid1),
        secret_key=str(uid1),
        user_caps="",
        generate_key=False,
        max_buckets=105,
        suspended=False,
        tenant="",
    )
    await admin.create_user(
        s3_client,
        uid=str(uid2),
        display_name="DN" + str(uid2),
        email=str(uid2) + "@email",
        key_type="s3",
        access_key=str(uid2),
        secret_key=str(uid2),
        user_caps="",
        generate_key=False,
        max_buckets=105,
        suspended=False,
        tenant="",
    )

    created_users.append("testid")

    res = await admin.list_uids(s3_client)
    assert len(res) == 3
    assert any(res[0] in s for s in created_users)
    assert any(res[1] in s for s in created_users)
    assert any(res[2] in s for s in created_users)

    created_users.remove("testid")


@pytest.mark.anyio
async def test_create_key(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        key_type="s3",
        access_key=str(uid1),
        secret_key=str(uid1),
        user_caps="",
        generate_key=False,
        max_buckets=105,
        suspended=False,
        tenant="",
    )

    res = await admin.create_key(
        s3_client, str(uid1), "s3", "zz" + str(uid1), "zz" + str(uid1), False
    )

    assert len(res) == 2
    assert res[0].user == str(uid1)
    assert res[0].access_key == str(uid1)
    assert res[0].secret_key == str(uid1)
    assert res[1].user == str(uid1)
    assert res[1].access_key == "zz" + str(uid1)
    assert res[1].secret_key == "zz" + str(uid1)


@pytest.mark.anyio
async def test_get_keys(s3_client: S3GWClient) -> None:
    res = await admin.get_keys(s3_client, "testid")
    assert len(res) == 1
    assert res[0].user == "testid"
    assert res[0].access_key == "test"
    assert res[0].secret_key == "test"


@pytest.mark.anyio
async def test_delete_key(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        key_type="s3",
        access_key="zz" + str(uid1),
        secret_key="zz" + str(uid1),
        user_caps="",
        generate_key=False,
        max_buckets=105,
        suspended=False,
        tenant="",
    )

    res = await admin.create_key(s3_client, str(uid1), "s3", "", "", True)
    assert len(res) == 2
    assert res[0].user == str(uid1)

    res = await admin.delete_key(s3_client, str(uid1), res[0].access_key)

    res = await admin.get_keys(s3_client, str(uid1))
    assert len(res) == 1
    assert res[0].user == str(uid1)
    assert res[0].access_key == "zz" + str(uid1)
    assert res[0].secret_key == "zz" + str(uid1)


@pytest.mark.anyio
async def test_quota_update(s3_client: S3GWClient) -> None:
    global created_users
    uid1 = uuid.uuid4()
    created_users.append(str(uid1))

    await admin.create_user(
        s3_client,
        uid=str(uid1),
        display_name="DN" + str(uid1),
        email=str(uid1) + "@email",
        key_type="s3",
        access_key=str(uid1),
        secret_key=str(uid1),
        user_caps="",
        generate_key=False,
        max_buckets=105,
        suspended=False,
        tenant="",
    )
    await admin.quota_update(s3_client, str(uid1), 998, 2000, "user", True)


@pytest.mark.anyio
async def test_bucket_list(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    bucket_name2 = uuid.uuid4()
    bucket_name3 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))
    created_buckets.append(str(bucket_name2))
    created_buckets.append(str(bucket_name3))

    await bucket.create_bucket(s3_client, str(bucket_name1))
    await bucket.create_bucket(s3_client, str(bucket_name2))
    await bucket.create_bucket(s3_client, str(bucket_name3))
    res = await admin.bucket_list(s3_client, "testid")
    assert len(res) == 3
    assert any(res[0].bucket in s for s in created_buckets)
    assert any(res[1].bucket in s for s in created_buckets)
    assert any(res[2].bucket in s for s in created_buckets)
    assert res[0].owner == "testid"
    assert res[1].owner == "testid"
    assert res[2].owner == "testid"


@pytest.mark.anyio
async def test_bucket_info(s3_client: S3GWClient) -> None:
    global created_buckets
    bucket_name1 = uuid.uuid4()
    created_buckets.append(str(bucket_name1))
    await bucket.create_bucket(s3_client, str(bucket_name1))
    res = await admin.bucket_info(s3_client, str(bucket_name1))
    assert res.bucket == str(bucket_name1)
    assert res.owner == "testid"
