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

from typing import Any, Dict, Literal

import httpx
from botocore.auth import HmacV1Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

from backend.admin_ops.errors import error_from_response


def signed_request(
    *,
    access: str,
    secret: str,
    method: str,
    url: str,
    data: Dict[str, Any] | None = None,
    params: Dict[str, Any] | None = None,
    headers: Dict[str, Any] | None = None,
) -> httpx.Request:
    """
    Returns a request signed with AWS HMAC v1 Auth (SHA1), which is what is
    understood by RGW's admin ops authentication.
    """
    creds = Credentials(access, secret)
    aws_req = AWSRequest(
        method=method, url=url, data=data, params=params, headers=headers
    )
    # NOTE(jecluis): it seems that query parameters are not considered for the
    # signature, unless they are provided via the URL, and always with a '/'
    # after the base URL:port address. E.g., http://foo.bar:123/?param1=baz
    # works, whereas http://foo.bar:123?param1=baz does not.
    #
    HmacV1Auth(credentials=creds).add_auth(aws_req)

    return httpx.Request(
        method=method,
        url=url,
        params=aws_req.params,
        data=aws_req.data,
        headers=dict(aws_req.headers),
    )


HTTPMethodType = (
    Literal["GET"] | Literal["POST"] | Literal["PUT"] | Literal["DELETE"]
)


async def send_request(req: httpx.Request) -> httpx.Response:
    async with httpx.AsyncClient() as client:
        res: httpx.Response = await client.send(req)
        if not res.is_success:
            raise error_from_response(res)
        return res


async def do_request(
    *,
    url: str,
    access_key: str,
    secret_key: str,
    endpoint: str,
    method: HTTPMethodType,
    params: Dict[str, Any] | None = None,
    headers: Dict[str, Any] | None = None,
) -> httpx.Response:
    ep = endpoint if endpoint.startswith("/") else f"/{endpoint}"

    req = signed_request(
        access=access_key,
        secret=secret_key,
        method=method,
        url=f"{url}{ep}",
        params=params,
        headers=headers,
    )

    return await send_request(req)
