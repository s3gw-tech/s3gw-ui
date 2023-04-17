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

import asyncio
from typing import Any, Dict, List, Literal, cast

import httpx
from pydantic import parse_obj_as

from backend.admin_ops import signed_request
from backend.admin_ops.errors import MissingParameterError, error_from_response
from backend.admin_ops.types import (
    AuthUser,
    ParamsModel,
    UserInfo,
    UserKeyOpParams,
    UserKeys,
    UserOpParams,
    UserQuotaOpParams,
)


def _model_to_params(model: ParamsModel) -> Dict[str, Any]:
    """
    Translates a `UserOpParams` class to a dictionary we can consume as
    parameters for an admin ops api request.
    """
    return {k: v for k, v in model.dict(by_alias=True).items() if v is not None}


HTTPMethodType = (
    Literal["GET"] | Literal["POST"] | Literal["PUT"] | Literal["DELETE"]
)


async def _do_request(
    *,
    url: str,
    access_key: str,
    secret_key: str,
    endpoint: str,
    method: HTTPMethodType,
    params: Dict[str, Any] | None = None,
) -> httpx.Response:
    ep = endpoint if endpoint.startswith("/") else f"/{endpoint}"

    req = signed_request(
        access=access_key,
        secret=secret_key,
        method=method,
        url=f"{url}{ep}",
        params=params,
    )

    async with httpx.AsyncClient() as client:
        res: httpx.Response = await client.send(req)
        if not res.is_success:
            raise error_from_response(res)

        return res


async def get_user_info(
    url: str,
    access_key: str,
    secret_key: str,
    uid: str | None = None,
    with_statistics: bool = False,
) -> UserInfo:
    """
    Obtain informations about the user to whom the `access_key:secret_key` pair
    belongs to.
    """
    params = {"access-key": access_key, "stats": with_statistics}
    if uid is not None and len(uid) > 0:
        params["uid"] = uid

    res = await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user",
        method="GET",
        params=params,
    )
    return UserInfo.parse_obj(res.json())


async def get_auth_user(url: str, access_key: str, secret_key: str) -> AuthUser:
    """
    Check if the given credentials are valid and whether the user is allowed
    access to the admin ops API.
    """
    info = await get_user_info(url, access_key, secret_key)
    return AuthUser(
        user_id=info.user_id,
        display_name=info.display_name,
        is_admin=info.admin,
    )


async def list_uids(url: str, access_key: str, secret_key: str) -> List[str]:
    """Obtain a list of all user ids."""

    res = await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        method="GET",
        endpoint="/admin/metadata/user",
    )
    lst: Any = res.json()
    assert isinstance(lst, list)
    return cast(List[str], lst)


async def list_users(
    url: str, access_key: str, secret_key: str, with_statistics: bool = False
) -> List[UserInfo]:
    """
    Obtain a list of users, by first performing a `list_uids()` operation, and
    then, for each `uid` returned, obtains said `uid` user info by running
    `get_user_info()` in parallel. For a large enough number of `uids`, this
    operation's complexity is non-negligible.
    """

    uids = await list_uids(url, access_key, secret_key)
    assert len(uids) > 0

    requests = [
        get_user_info(
            url,
            access_key,
            secret_key,
            uid=uid,
            with_statistics=with_statistics,
        )
        for uid in uids
    ]

    uinfo_lst: List[UserInfo] = await asyncio.gather(
        *requests, return_exceptions=True
    )
    assert len(uinfo_lst) > 0
    return uinfo_lst


async def create(
    url: str, access_key: str, secret_key: str, user: UserOpParams
) -> UserInfo:
    """Creates a new user, as specified by the `user` argument."""

    if user.display_name is None:
        raise MissingParameterError("display name")

    user.key_type = "s3"

    params: Dict[str, Any] = _model_to_params(user)

    res = await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user",
        method="PUT",
        params=params,
    )
    return UserInfo.parse_obj(res.json())


async def delete(url: str, access_key: str, secret_key: str, uid: str) -> None:
    """Deletes a user, specified by `uid`."""

    params = {"uid": uid}
    await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user",
        method="DELETE",
        params=params,
    )


async def update(
    url: str, access_key: str, secret_key: str, user: UserOpParams
) -> UserInfo:
    """Modifies a user, setting the values specified by `user`."""

    params: Dict[str, Any] = _model_to_params(user)
    res = await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user",
        method="POST",
        params=params,
    )
    return UserInfo.parse_obj(res.json())


async def create_key(
    url: str, access_key: str, secret_key: str, key_params: UserKeyOpParams
) -> List[UserKeys]:
    """Creates a new key for a user specified in `key_params`."""

    params: Dict[str, Any] = _model_to_params(key_params)
    res = await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user?key",
        method="PUT",
        params=params,
    )
    return parse_obj_as(List[UserKeys], res.json())


async def get_keys(
    url: str, access_key: str, secret_key: str, uid: str
) -> List[UserKeys]:
    """Obtain all keys for a given user."""

    user = await get_user_info(url, access_key, secret_key, uid)
    return user.keys


async def delete_key(
    url: str,
    access_key: str,
    secret_key: str,
    uid: str,
    user_access_key: str,
) -> None:
    """Deletes the key `user_access_key` from user `uid`."""

    params: Dict[str, str] = {"uid": uid, "access-key": user_access_key}
    await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user?key",
        method="DELETE",
        params=params,
    )


async def quota_update(
    url: str,
    access_key: str,
    secret_key: str,
    uid: str,
    quota: UserQuotaOpParams,
) -> None:
    """Updates user's `uid` quota to `quota`."""

    assert quota.quota_type is not None
    assert quota.quota_type == "user"

    params: Dict[str, Any] = _model_to_params(quota)
    params["uid"] = uid

    await _do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user?quota",
        method="PUT",
        params=params,
    )
