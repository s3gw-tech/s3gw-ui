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

from typing import Annotated, List, Optional

from fastapi import Depends
from fastapi.routing import APIRouter

import backend.admin_ops.buckets as admin_ops_buckets
import backend.admin_ops.types as admin_ops_types
import backend.admin_ops.users as admin_ops_users
from backend.api import S3GWClient, s3gw_client, s3gw_client_responses

router = APIRouter(prefix="/admin")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


##############################################################################
# Users
##############################################################################
@router.get(
    "/users/{uid}",
    response_model=admin_ops_types.UserInfo,
    responses=s3gw_client_responses(),
)
async def get_user(
    conn: S3GWClientDep, uid: str, stats: bool = False
) -> admin_ops_types.UserInfo:
    res = await admin_ops_users.get_user_info(
        conn.endpoint, conn.access_key, conn.secret_key, uid, stats
    )
    return res


@router.post(
    "/users",
    response_model=admin_ops_types.UserInfo,
    responses=s3gw_client_responses(),
)
async def create_user(
    conn: S3GWClientDep,
    uid: str,
    display_name: str,
    email: str,
    suspended: bool,
    max_buckets: int,
    generate_key: bool = True,
    access_key: Optional[str] = None,
    secret_key: Optional[str] = None,
    user_caps: Optional[str] = None,
    tenant: Optional[str] = None,
) -> admin_ops_types.UserInfo:
    res = await admin_ops_users.create(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        user=admin_ops_types.UserOpParams(
            uid=uid,
            display_name=display_name,
            email=email,
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
    "/users/{uid}",
    responses=s3gw_client_responses(),
)
async def delete_user(conn: S3GWClientDep, uid: str) -> None:
    res = await admin_ops_users.delete(
        conn.endpoint, conn.access_key, conn.secret_key, uid=uid
    )
    return res


@router.get(
    "/users/{uid}/authenticate",
    response_model=admin_ops_types.AuthUser,
    responses=s3gw_client_responses(),
)
async def authenticate_user(conn: S3GWClientDep) -> admin_ops_types.AuthUser:
    res = await admin_ops_users.get_auth_user(
        conn.endpoint, conn.access_key, conn.secret_key
    )
    return res


@router.get(
    "/users",
    response_model=List[str],
    responses=s3gw_client_responses(),
)
async def list_users(conn: S3GWClientDep) -> List[str]:
    res = await admin_ops_users.list_uids(
        conn.endpoint, conn.access_key, conn.secret_key
    )
    return res


@router.put(
    "/users/{uid}/keys",
    response_model=List[admin_ops_types.UserKeys],
    responses=s3gw_client_responses(),
)
async def create_user_key(
    conn: S3GWClientDep,
    uid: str,
    generate_key: bool = True,
    access_key: Optional[str] = None,
    secret_key: Optional[str] = None,
) -> List[admin_ops_types.UserKeys]:
    res = await admin_ops_users.create_key(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        key_params=admin_ops_types.UserKeyOpParams(
            uid=uid,
            access_key=access_key,
            secret_key=secret_key,
            generate_key=generate_key,
        ),
    )
    return res


@router.get(
    "/users/{uid}/keys",
    response_model=List[admin_ops_types.UserKeys],
    responses=s3gw_client_responses(),
)
async def get_user_keys(
    conn: S3GWClientDep, uid: str
) -> List[admin_ops_types.UserKeys]:
    res = await admin_ops_users.get_keys(
        conn.endpoint, conn.access_key, conn.secret_key, uid=uid
    )
    return res


@router.delete(
    "/users/{uid}/keys/{access_key}",
    responses=s3gw_client_responses(),
)
async def delete_user_key(
    conn: S3GWClientDep, uid: str, access_key: str
) -> None:
    await admin_ops_users.delete_key(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        uid=uid,
        user_access_key=access_key,
    )


@router.put(
    "/users/{uid}/quota",
    responses=s3gw_client_responses(),
)
async def update_user_quota(
    conn: S3GWClientDep,
    uid: str,
    max_objects: int,
    max_size: int,
    enabled: bool,
) -> None:
    await admin_ops_users.quota_update(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        uid=uid,
        quota=admin_ops_types.UserQuotaOpParams(
            max_objects=max_objects,
            max_size=max_size,
            quota_type="user",
            enabled=enabled,
        ),
    )


@router.get(
    "/users/{uid}/buckets",
    response_model=List[admin_ops_types.Bucket],
    responses=s3gw_client_responses(),
)
async def list_user_buckets(
    conn: S3GWClientDep, uid: str
) -> List[admin_ops_types.Bucket]:
    res = await admin_ops_buckets.list_buckets(
        conn.endpoint, conn.access_key, conn.secret_key, uid=uid
    )
    return res


##############################################################################
# Buckets
##############################################################################
@router.get(
    "/buckets/{bucket_name}",
    response_model=admin_ops_types.Bucket,
    responses=s3gw_client_responses(),
)
async def bucket_info(
    conn: S3GWClientDep, bucket_name: str
) -> admin_ops_types.Bucket:
    res = await admin_ops_buckets.get_bucket(
        conn.endpoint, conn.access_key, conn.secret_key, bucket_name=bucket_name
    )
    return res
