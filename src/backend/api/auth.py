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

from fastapi import Depends, HTTPException
from fastapi.routing import APIRouter
from types_aiobotocore_s3.type_defs import ListBucketsOutputTypeDef

import backend.admin_ops.types as admin_ops_types
import backend.admin_ops.users as admin_ops_users
from backend.api import S3GWClient, s3gw_client, s3gw_client_responses
from backend.api.types import AuthUser

router = APIRouter(prefix="/auth")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


@router.get(
    "/authenticate",
    response_model=AuthUser,
    responses=s3gw_client_responses(),
)
async def authenticate(conn: S3GWClientDep) -> AuthUser:
    # Try to access a RGW Admin Ops endpoint first. If that works, the
    # given credentials have `admin` privileges. If it fails, try to
    # access a RGW endpoint via AWS S3 API. If that works, the given
    # credentials can be used to sign in as `regular` user.
    try:
        admin_ops_res: admin_ops_types.UserInfo = (
            await admin_ops_users.get_user_info(
                conn.endpoint,
                conn.access_key,
                conn.secret_key,
                user_access_key=conn.access_key,
            )
        )
        res = AuthUser(
            ID=admin_ops_res.user_id,
            DisplayName=admin_ops_res.display_name,
            IsAdmin=admin_ops_res.admin,
        )
    except HTTPException:
        # Handle ALL HTTP related exceptions here, e.g. connection errors.
        # The `httpx` library used for calling the Admin Ops API does not
        # provide meaningful error messages, whereas `botocore` provides
        # connection error messages that might be more helpful when they
        # are displayed in the UI.
        async with conn.conn() as s3:
            s3_res: ListBucketsOutputTypeDef = await s3.list_buckets()
            res = AuthUser(
                ID=s3_res["Owner"]["ID"],
                DisplayName=s3_res["Owner"]["DisplayName"],
                IsAdmin=False,
            )
    return res
