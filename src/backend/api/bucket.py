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
from datetime import datetime as dt
from typing import Annotated, List, Literal, Optional

import pydash
from fastapi import Depends, HTTPException, status
from fastapi.logger import logger
from fastapi.routing import APIRouter
from pydantic import BaseModel, parse_obj_as
from types_aiobotocore_s3.type_defs import (
    GetBucketTaggingOutputTypeDef,
    GetBucketVersioningOutputTypeDef,
    GetObjectLockConfigurationOutputTypeDef,
    ListBucketsOutputTypeDef,
    TaggingTypeDef,
    TagTypeDef,
)

import backend.admin_ops.buckets as admin_ops_buckets
from backend.api import S3GWClient, s3gw_client, s3gw_client_responses

router = APIRouter(prefix="/bucket")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


class BucketResponse(BaseModel):
    Name: str
    CreationDate: dt


class Tag(BaseModel):
    Key: str
    Value: str


class BucketObjectLockResponse(BaseModel):
    ObjectLockEnabled: Optional[bool]
    RetentionEnabled: Optional[bool]
    RetentionMode: Optional[Literal["GOVERNANCE", "COMPLIANCE"]]
    RetentionValidity: Optional[int]
    RetentionUnit: Optional[Literal["Days", "Years"]]


class BucketAttributesResponse(BucketResponse, BucketObjectLockResponse):
    TagSet: List[Tag]
    VersioningEnabled: Optional[bool]


@router.get(
    "/list",
    response_model=List[BucketResponse],
    responses=s3gw_client_responses(),
)
async def get_bucket_list(conn: S3GWClientDep) -> List[BucketResponse]:
    """
    See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/list_buckets.html
    """
    async with conn.conn() as s3:
        lb_res: ListBucketsOutputTypeDef = await s3.list_buckets()
        res = parse_obj_as(List[BucketResponse], lb_res["Buckets"])
    return res


@router.get(
    "/count",
    response_model=int,
    responses=s3gw_client_responses(),
)
async def get_bucket_count(conn: S3GWClientDep) -> int:
    res: List[BucketResponse] = await get_bucket_list(conn)
    return len(res)


@router.post(
    "/create",
    responses=s3gw_client_responses(),
)
async def create_bucket(
    conn: S3GWClientDep, bucket_name: str, enable_object_locking: bool = False
) -> None:
    async with conn.conn() as s3:
        try:
            await s3.create_bucket(
                Bucket=bucket_name,
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


@router.delete(
    "/delete/{bucket_name}",
    responses=s3gw_client_responses(),
)
async def delete_bucket(conn: S3GWClientDep, bucket_name: str) -> None:
    """
    See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_bucket.html
    """
    async with conn.conn() as s3:
        await s3.delete_bucket(Bucket=bucket_name)


@router.get(
    "/get/{bucket_name}",
    response_model=BucketResponse,
    responses=s3gw_client_responses(),
)
async def get_bucket(conn: S3GWClientDep, bucket_name: str) -> BucketResponse:
    # Use the Admin Ops API here because it is surely cheaper than
    # calling 's3.list_buckets()' and picking the bucket from that list.
    res = await admin_ops_buckets.get(
        conn.endpoint, conn.access_key, conn.secret_key, bucket_name
    )
    return BucketResponse(Name=res.bucket, CreationDate=res.creation_time)


@router.get(
    "/versioning/{bucket_name}",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def get_bucket_versioning(conn: S3GWClientDep, bucket_name: str) -> bool:
    """
    See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_versioning.html
    """
    async with conn.conn() as s3:
        gbv_res: GetBucketVersioningOutputTypeDef = (
            await s3.get_bucket_versioning(Bucket=bucket_name)
        )
        res = pydash.get(gbv_res, "Status", "Suspended") == "Enabled"
    return res


@router.post(
    "/versioning/{bucket_name}",
    responses=s3gw_client_responses(),
)
async def set_bucket_versioning(
    conn: S3GWClientDep, bucket_name: str, enabled: bool
) -> None:
    """
    See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_versioning.html
    """
    async with conn.conn() as s3:
        vc = {"Status": "Enabled" if enabled else "Suspended"}
        await s3.put_bucket_versioning(
            Bucket=bucket_name, VersioningConfiguration=vc  # type: ignore
        )


@router.get(
    "/object-lock/{bucket_name}",
    response_model=BucketObjectLockResponse,
    responses=s3gw_client_responses(),
)
async def get_bucket_object_lock(
    conn: S3GWClientDep, bucket_name: str
) -> BucketObjectLockResponse:
    async with conn.conn() as s3:
        try:
            golc_res: GetObjectLockConfigurationOutputTypeDef = (
                await s3.get_object_lock_configuration(Bucket=bucket_name)
            )
            res = BucketObjectLockResponse(
                ObjectLockEnabled=pydash.get(
                    golc_res, "ObjectLockConfiguration.ObjectLockEnabled"
                )
                == "Enabled",
                RetentionEnabled=pydash.has(
                    golc_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Mode",
                ),
                RetentionMode=pydash.get(
                    golc_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Mode",
                ),
                RetentionValidity=pydash.get(
                    golc_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Days",
                    pydash.get(
                        golc_res,
                        "ObjectLockConfiguration.Rule.DefaultRetention.Years",
                    ),
                ),
                RetentionUnit="Years"
                if pydash.is_number(
                    pydash.get(
                        golc_res,
                        "ObjectLockConfiguration.Rule.DefaultRetention.Years",
                    )
                )
                else "Days",
            )
        except s3.exceptions.ClientError as err:
            if (
                err.response["Error"]["Code"]
                == "ObjectLockConfigurationNotFoundError"
            ):
                res = BucketObjectLockResponse.parse_obj(
                    {"ObjectLockEnabled": False}
                )
            else:
                raise err
    return res


@router.get(
    "/tagging/{bucket_name}",
    response_model=List[Tag],
    responses=s3gw_client_responses(),
)
async def get_bucket_tagging(
    conn: S3GWClientDep, bucket_name: str
) -> List[Tag]:
    """
    See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_tagging.html
    """
    async with conn.conn() as s3:
        try:
            gbt_res: GetBucketTaggingOutputTypeDef = (
                await s3.get_bucket_tagging(Bucket=bucket_name)
            )
            res = parse_obj_as(List[Tag], gbt_res["TagSet"])
        except s3.exceptions.ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchTagSet":
                res = []
            else:
                raise err
    return res


@router.post(
    "/tagging/{bucket_name}",
    responses=s3gw_client_responses(),
)
async def set_bucket_tagging(
    conn: S3GWClientDep, bucket_name: str, tags: List[TagTypeDef]
) -> None:
    """
    See https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_tagging.html
    """
    async with conn.conn() as s3:
        tag_set: TaggingTypeDef = {"TagSet": tags}
        await s3.put_bucket_tagging(Bucket=bucket_name, Tagging=tag_set)


@router.get(
    "/attributes/{bucket_name}",
    response_model=BucketAttributesResponse,
    responses=s3gw_client_responses(),
)
async def get_bucket_attributes(
    conn: S3GWClientDep, bucket_name: str
) -> BucketAttributesResponse:
    requests = [
        get_bucket(bucket_name=bucket_name, conn=conn),
        get_bucket_versioning(bucket_name=bucket_name, conn=conn),
        get_bucket_object_lock(bucket_name=bucket_name, conn=conn),
        get_bucket_tagging(bucket_name=bucket_name, conn=conn),
    ]
    gb_res, gbv_res, gbol_res, gbt_res = await asyncio.gather(
        *requests, return_exceptions=True
    )
    res = BucketAttributesResponse.parse_obj(
        gb_res.dict() | gbol_res.dict() | {"TagSet": gbt_res}
    )
    res.VersioningEnabled = gbv_res
    return res
