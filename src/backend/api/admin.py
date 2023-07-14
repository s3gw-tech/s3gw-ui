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

from typing import Annotated

from fastapi import Depends
from fastapi.routing import APIRouter

import backend.admin_ops.types as admin_ops_types
import backend.admin_ops.users as admin_ops_users
from backend.api import S3GWClient, s3gw_client, s3gw_client_responses

router = APIRouter(prefix="/admin")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


@router.get(
    "/userInfo",
    response_model=admin_ops_types.UserInfo,
    responses=s3gw_client_responses(),
)
async def get_user_info(
    conn: S3GWClientDep, uid: str, with_statistics: bool
) -> admin_ops_types.UserInfo:
    res = await admin_ops_users.get_user_info(
        conn.endpoint, conn.access_key, conn.secret_key, uid, with_statistics
    )
    return res


@router.put(
    "/userCreate",
    response_model=admin_ops_types.UserInfo,
    responses=s3gw_client_responses(),
)
async def create_user(
    conn: S3GWClientDep,
    uid: str,
    display_name: str,
    email: str,
    key_type: str,
    access_key: str,
    secret_key: str,
    user_caps: str,
    generate_key: bool,
    max_buckets: int,
    suspended: bool,
    tenant: str,
) -> admin_ops_types.UserInfo:
    res = await admin_ops_users.create(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        user=admin_ops_types.UserOpParams(
            uid=uid,
            display_name=display_name,
            email=email,
            key_type=key_type,
            access_key=access_key,
            secret_key=secret_key,
            user_caps=user_caps,
            generate_key=generate_key,
            max_buckets=max_buckets,
            suspended=suspended,
            tenant=tenant,
        ),
    )
    return res


@router.delete(
    "/userDelete",
    responses=s3gw_client_responses(),
)
async def delete_user(conn: S3GWClientDep, uid: str) -> None:
    res = await admin_ops_users.delete(
        conn.endpoint, conn.access_key, conn.secret_key, uid=uid
    )
    return res
