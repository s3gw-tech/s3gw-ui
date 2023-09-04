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

from typing import Annotated, List, Optional, Union

from fastapi import Depends, Response, status
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
@router.head(
    "/users/{uid}",
    responses=s3gw_client_responses(),
)
async def user_exists(conn: S3GWClientDep, uid: str) -> Response:
    res = await admin_ops_users.list_uids(
        conn.endpoint, conn.access_key, conn.secret_key
    )
    status_code = (
        status.HTTP_200_OK if uid in res else status.HTTP_404_NOT_FOUND
    )
    return Response(content="", status_code=status_code)


@router.get(
    "/users/{uid}",
    name="get_user",
    response_model=admin_ops_types.UserInfo,
    responses=s3gw_client_responses(),
)
async def get_user(
    conn: S3GWClientDep, uid: str, stats: bool = False
) -> admin_ops_types.UserInfo:
    res = await admin_ops_users.get_user_info(
        conn.endpoint, conn.access_key, conn.secret_key, uid=uid, stats=stats
    )
    return res


@router.put(
    "/users/{uid}",
    response_model=admin_ops_types.UserInfo,
    responses=s3gw_client_responses(),
)
async def update_user(
    conn: S3GWClientDep,
    uid: str,
    display_name: Optional[str] = None,
    email: Optional[str] = None,
    suspended: Optional[bool] = None,
    max_buckets: Optional[int] = None,
    admin: Optional[bool] = None,
) -> admin_ops_types.UserInfo:
    res = await admin_ops_users.update(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        user=admin_ops_types.UserOpParams(
            uid=uid,
            display_name=display_name,
            email=email,
            max_buckets=max_buckets,
            suspended=suspended,
            admin=admin,
        ),
    )
    return res


@router.put(
    "/users/",
    response_model=admin_ops_types.UserInfo,
    responses=s3gw_client_responses(),
    status_code=status.HTTP_201_CREATED,
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
    admin: Optional[bool] = None,
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
            admin=admin,
        ),
    )
    return res


@router.delete(
    "/users/{uid}",
    response_model=str,
    responses=s3gw_client_responses(),
)
async def delete_user(conn: S3GWClientDep, uid: str) -> str:
    res = await admin_ops_users.delete(
        conn.endpoint, conn.access_key, conn.secret_key, uid=uid
    )
    return res


@router.get(
    "/users/",
    response_model=Union[List[str], List[admin_ops_types.UserInfo]],
    responses=s3gw_client_responses(),
)
async def list_users(
    conn: S3GWClientDep, details: bool = False, stats: bool = False
) -> Union[List[str], List[admin_ops_types.UserInfo]]:
    if not details:
        res = await admin_ops_users.list_uids(
            conn.endpoint, conn.access_key, conn.secret_key
        )
    else:
        res = await admin_ops_users.list_users(
            conn.endpoint, conn.access_key, conn.secret_key, stats
        )
    return res


@router.post(
    "/users/{uid}/keys",
    responses=s3gw_client_responses(),
    status_code=status.HTTP_201_CREATED,
)
async def create_user_key(
    conn: S3GWClientDep,
    response: Response,
    uid: str,
    generate_key: bool = True,
    access_key: Optional[str] = None,
    secret_key: Optional[str] = None,
) -> None:
    await admin_ops_users.create_key(
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
    response.headers["location"] = router.url_path_for("get_user_keys", uid=uid)


@router.get(
    "/users/{uid}/keys",
    name="get_user_keys",
    response_model=List[admin_ops_types.UserKey],
    responses=s3gw_client_responses(),
)
async def get_user_keys(
    conn: S3GWClientDep, uid: str
) -> List[admin_ops_types.UserKey]:
    res = await admin_ops_users.get_keys(
        conn.endpoint, conn.access_key, conn.secret_key, uid=uid
    )
    return res


@router.delete(
    "/users/{uid}/keys",
    response_model=admin_ops_types.UserKey,
    responses=s3gw_client_responses(),
)
async def delete_user_key(
    conn: S3GWClientDep, uid: str, access_key: str
) -> admin_ops_types.UserKey:
    res = await admin_ops_users.delete_key(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        uid=uid,
        user_access_key=access_key,
    )
    return res


@router.put(
    "/users/{uid}/quota",
    responses=s3gw_client_responses(),
    status_code=status.HTTP_204_NO_CONTENT,
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


@router.get(
    "/users/{uid}/usage-stats",
    response_model=admin_ops_types.UsageStats,
    responses=s3gw_client_responses(),
)
async def get_user_usage_stats(
    conn: S3GWClientDep, uid: str
) -> admin_ops_types.UsageStats:
    res = await admin_ops_users.get_usage_stats(
        conn.endpoint, conn.access_key, conn.secret_key
    )
    return res


##############################################################################
# Buckets
##############################################################################
@router.get(
    "/buckets/",
    response_model=List[admin_ops_types.Bucket],
    responses=s3gw_client_responses(),
)
async def list_buckets(
    conn: S3GWClientDep, uid: Optional[str] = None
) -> List[admin_ops_types.Bucket]:
    res = await admin_ops_buckets.list_buckets(
        conn.endpoint, conn.access_key, conn.secret_key, uid
    )
    return res


@router.get(
    "/buckets/{bucket}",
    response_model=admin_ops_types.Bucket,
    responses=s3gw_client_responses(),
)
async def get_bucket_info(
    conn: S3GWClientDep, bucket: str
) -> admin_ops_types.Bucket:
    res = await admin_ops_buckets.get_bucket_info(
        conn.endpoint, conn.access_key, conn.secret_key, bucket=bucket
    )
    return res


@router.head(
    "/buckets/{bucket}",
    responses=s3gw_client_responses(),
)
async def bucket_exists(conn: S3GWClientDep, bucket: str) -> Response:
    await admin_ops_buckets.get_bucket_info(
        conn.endpoint, conn.access_key, conn.secret_key, bucket=bucket
    )
    return Response(content="", status_code=status.HTTP_200_OK)


@router.delete(
    "/buckets/{bucket}",
    response_model=str,
    responses=s3gw_client_responses(),
)
async def delete_bucket(
    conn: S3GWClientDep, bucket: str, purge_objects: bool = True
) -> str:
    res = await admin_ops_buckets.delete_bucket(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        bucket=bucket,
        purge_objects=purge_objects,
    )
    return res


@router.put(
    "/buckets/{bucket}/link",
    responses=s3gw_client_responses(),
    status_code=status.HTTP_204_NO_CONTENT,
)
async def link_bucket(
    conn: S3GWClientDep, bucket: str, bucket_id: str, uid: str
) -> None:
    await admin_ops_buckets.link_bucket(
        conn.endpoint,
        conn.access_key,
        conn.secret_key,
        bucket=bucket,
        bucket_id=bucket_id,
        uid=uid,
    )
