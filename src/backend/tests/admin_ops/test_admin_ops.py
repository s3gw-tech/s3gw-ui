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
