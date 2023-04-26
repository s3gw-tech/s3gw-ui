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
from typing import Any, Dict, List, Optional, cast

from pydantic import parse_obj_as

from backend.admin_ops import do_request
from backend.admin_ops.errors import MissingParameterError
from backend.admin_ops.types import (
    UsageStats,
    UserInfo,
    UserKey,
    UserKeyOpParams,
    UserOpParams,
    UserQuotaOpParams,
    params_model_to_params,
)


async def get_user_info(
    url: str,
    access_key: str,
    secret_key: str,
    uid: Optional[str] = None,
    user_access_key: Optional[str] = None,
    stats: bool = False,
) -> UserInfo:
    """
    Obtain information about the user to whom the `access_key:secret_key` pair
    belongs to.

    See https://docs.ceph.com/en/latest/radosgw/adminops/#get-user-info
    """
    params: Dict[str, Any] = {"stats": stats}
    if uid is not None:
        params["uid"] = uid
    if user_access_key is not None:
        params["access-key"] = user_access_key

    res = await do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user",
        method="GET",
        params=params,
    )
    return UserInfo.parse_obj(res.json())


async def list_uids(url: str, access_key: str, secret_key: str) -> List[str]:
    """Obtain a list of all user ids."""

    res = await do_request(
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
    url: str, access_key: str, secret_key: str, stats: bool = False
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
            stats=stats,
        )
        for uid in uids
    ]

    reqs_res = await asyncio.gather(*requests, return_exceptions=True)
    assert len(reqs_res) > 0

    res = parse_obj_as(List[UserInfo], reqs_res)
    return res


async def create(
    url: str, access_key: str, secret_key: str, user: UserOpParams
) -> UserInfo:
    """
    Creates a new user, as specified by the `user` argument.

    See https://docs.ceph.com/en/latest/radosgw/adminops/#create-user
    """

    if user.display_name is None:
        raise MissingParameterError("display name")

    user.key_type = "s3"

    params: Dict[str, Any] = params_model_to_params(user)

    res = await do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user",
        method="PUT",
        params=params,
    )
    return UserInfo.parse_obj(res.json())


async def delete(url: str, access_key: str, secret_key: str, uid: str) -> str:
    """
    Deletes a user, specified by `uid`.

    See https://docs.ceph.com/en/latest/radosgw/adminops/#remove-user
    """

    params = {"uid": uid}
    await do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user",
        method="DELETE",
        params=params,
    )
    return uid


async def update(
    url: str, access_key: str, secret_key: str, user: UserOpParams
) -> UserInfo:
    """
    Modifies a user, setting the values specified by `user`.

    See https://docs.ceph.com/en/latest/radosgw/adminops/#modify-user
    """

    params: Dict[str, Any] = params_model_to_params(user)
    res = await do_request(
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
) -> List[UserKey]:
    """
    Creates a new key for a user specified in `key_params`.

    See https://docs.ceph.com/en/latest/radosgw/adminops/#create-key
    """

    params: Dict[str, Any] = params_model_to_params(key_params)
    res = await do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user?key",
        method="PUT",
        params=params,
    )
    return parse_obj_as(List[UserKey], res.json())


async def get_keys(
    url: str, access_key: str, secret_key: str, uid: str
) -> List[UserKey]:
    """Obtain all keys for a given user."""

    user = await get_user_info(url, access_key, secret_key, uid)
    return user.keys


async def delete_key(
    url: str,
    access_key: str,
    secret_key: str,
    uid: str,
    user_access_key: str,
) -> UserKey:
    """
    Deletes the key `user_access_key` from user `uid`.

    See https://docs.ceph.com/en/latest/radosgw/adminops/#remove-key
    """

    params: Dict[str, str] = {"uid": uid, "access-key": user_access_key}
    await do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user?key",
        method="DELETE",
        params=params,
    )
    return UserKey(user=uid, access_key=user_access_key, secret_key="")


async def quota_update(
    url: str,
    access_key: str,
    secret_key: str,
    uid: str,
    quota: UserQuotaOpParams,
) -> None:
    """
    Updates user's `uid` quota to `quota`.

    See https://docs.ceph.com/en/latest/radosgw/adminops/#quotas
    """

    assert quota.quota_type is not None
    assert quota.quota_type == "user"

    params: Dict[str, Any] = params_model_to_params(quota)
    params["uid"] = uid

    await do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/admin/user?quota",
        method="PUT",
        params=params,
    )


async def get_usage_stats(
    url: str,
    access_key: str,
    secret_key: str,
) -> UsageStats:
    """
    See https://docs.ceph.com/en/latest/radosgw/s3/serviceops/#get-usage-stats
    """
    params: Dict[str, Any] = {"usage": ""}
    res = await do_request(
        url=url,
        access_key=access_key,
        secret_key=secret_key,
        endpoint="/",
        method="GET",
        params=params,
    )
    return UsageStats.parse_obj(res.json())
