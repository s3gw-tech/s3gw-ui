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

from typing import Annotated, List

from fastapi import Depends, HTTPException, status
from fastapi.logger import logger
from fastapi.routing import APIRouter
from pydantic import BaseModel
from types_aiobotocore_s3.type_defs import ListBucketsOutputTypeDef

from backend.api import S3GWClient, s3gw_client, s3gw_client_responses

router = APIRouter(prefix="/bucket")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


class BucketListResponse(BaseModel):
    buckets: List[str]


@router.get(
    "/list",
    response_model=BucketListResponse,
    responses=s3gw_client_responses(),
)
async def get_bucket_list(conn: S3GWClientDep) -> BucketListResponse:
    async with conn.conn() as s3:
        bucket_lst: ListBucketsOutputTypeDef = await s3.list_buckets()
        buckets = [b["Name"] for b in bucket_lst["Buckets"]]
        res = BucketListResponse(buckets=buckets)

    return res


@router.post(
    "/create",
    responses=s3gw_client_responses(),
)
async def bucket_create(
    conn: S3GWClientDep, name: str, enable_object_locking: bool = False
) -> None:
    async with conn.conn() as s3:
        try:
            await s3.create_bucket(
                Bucket=name,
                ObjectLockEnabledForBucket=enable_object_locking,
            )
        except s3.exceptions.BucketAlreadyExists:
            # everything points towards rgw (and even moto's server) to assume
            # that creating an existing bucket is idempotent; hence this may
            # never be called, and we are unable to exercise it via tests.
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bucket already exists",
            )
        except s3.exceptions.BucketAlreadyOwnedByYou:
            logger.error("Unexpected exception")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bucket already owned by requester",
            )
