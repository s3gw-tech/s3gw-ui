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
from typing import Annotated, List

import pydash
from fastapi import Depends, HTTPException, status
from fastapi.logger import logger
from fastapi.routing import APIRouter
from pydantic import parse_obj_as
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
from backend.api.types import Bucket, BucketAttributes, BucketObjectLock, Tag

router = APIRouter(prefix="/buckets")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


@router.get(
    "/",
    response_model=List[Bucket],
    responses=s3gw_client_responses(),
)
async def list_buckets(conn: S3GWClientDep) -> List[Bucket]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/list_buckets.html
    """
    async with conn.conn() as s3:
        lb_res: ListBucketsOutputTypeDef = await s3.list_buckets()
        res = parse_obj_as(List[Bucket], lb_res["Buckets"])
    return res


@router.post(
    "/",
    responses=s3gw_client_responses(),
)
async def create_bucket(
    conn: S3GWClientDep,
    bucket_name: str,
    enable_object_locking: bool = False,
) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/create_bucket.html
    """
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
    "/{bucket_name}",
    responses=s3gw_client_responses(),
)
async def delete_bucket(conn: S3GWClientDep, bucket_name: str) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_bucket.html
    """
    async with conn.conn() as s3:
        await s3.delete_bucket(Bucket=bucket_name)


@router.get(
    "/{bucket_name}",
    response_model=Bucket,
    responses=s3gw_client_responses(),
)
async def get_bucket(conn: S3GWClientDep, bucket_name: str) -> Bucket:
    # Use the Admin Ops API here because it is surely cheaper than
    # calling 's3.list_buckets()' and picking the bucket from that list.
    res = await admin_ops_buckets.get_bucket(
        conn.endpoint, conn.access_key, conn.secret_key, bucket_name
    )
    return Bucket(Name=res.bucket, CreationDate=res.creation_time)


@router.get(
    "/{bucket_name}/versioning",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def get_bucket_versioning(conn: S3GWClientDep, bucket_name: str) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_versioning.html
    """
    async with conn.conn() as s3:
        gbv_res: GetBucketVersioningOutputTypeDef = (
            await s3.get_bucket_versioning(Bucket=bucket_name)
        )
        res = pydash.get(gbv_res, "Status", "Suspended") == "Enabled"
    return res


@router.put(
    "/{bucket_name}/versioning",
    responses=s3gw_client_responses(),
)
async def set_bucket_versioning(
    conn: S3GWClientDep, bucket_name: str, enabled: bool
) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_versioning.html
    """
    async with conn.conn() as s3:
        vc = {"Status": "Enabled" if enabled else "Suspended"}
        await s3.put_bucket_versioning(
            Bucket=bucket_name, VersioningConfiguration=vc  # type: ignore
        )


@router.get(
    "/{bucket_name}/object-lock",
    response_model=BucketObjectLock,
    responses=s3gw_client_responses(),
)
async def get_bucket_object_lock_configuration(
    conn: S3GWClientDep, bucket_name: str
) -> BucketObjectLock:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_lock_configuration.html
    """
    async with conn.conn() as s3:
        try:
            req_res: GetObjectLockConfigurationOutputTypeDef = (
                await s3.get_object_lock_configuration(Bucket=bucket_name)
            )
            res = BucketObjectLock(
                ObjectLockEnabled=pydash.get(
                    req_res, "ObjectLockConfiguration.ObjectLockEnabled"
                )
                == "Enabled",
                RetentionEnabled=pydash.has(
                    req_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Mode",
                ),
                RetentionMode=pydash.get(
                    req_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Mode",
                ),
                RetentionValidity=pydash.get(
                    req_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Days",
                    pydash.get(
                        req_res,
                        "ObjectLockConfiguration.Rule.DefaultRetention.Years",
                    ),
                ),
                RetentionUnit="Years"
                if pydash.is_number(
                    pydash.get(
                        req_res,
                        "ObjectLockConfiguration.Rule.DefaultRetention.Years",
                    )
                )
                else "Days",
            )
        except s3.exceptions.ClientError as err:
            if (
                pydash.get(err.response, "Error.Code")
                == "ObjectLockConfigurationNotFoundError"
            ):
                res = BucketObjectLock.parse_obj({"ObjectLockEnabled": False})
            else:
                raise err
    return res


@router.put(
    "/{bucket_name}/object-lock",
    response_model=BucketObjectLock,
    responses=s3gw_client_responses(),
)
async def set_bucket_object_lock_configuration(
    conn: S3GWClientDep, bucket_name: str, config: BucketObjectLock
) -> BucketObjectLock:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_object_lock_configuration.html
    """
    res = BucketObjectLock.parse_obj({"ObjectLockEnabled": False})

    if (
        config.RetentionMode is not None
        and config.RetentionValidity is not None
        and config.RetentionUnit is not None
    ):
        async with conn.conn() as s3:
            try:
                await s3.put_object_lock_configuration(
                    Bucket=bucket_name,
                    ObjectLockConfiguration={
                        "ObjectLockEnabled": "Enabled",
                        "Rule": {
                            "DefaultRetention": {
                                "Mode": "GOVERNANCE"
                                if config.RetentionMode == "GOVERNANCE"
                                else "COMPLIANCE",
                                "Days": config.RetentionValidity,
                            }
                        },
                    }
                    if config.RetentionUnit == "Days"
                    else {
                        "ObjectLockEnabled": "Enabled",
                        "Rule": {
                            "DefaultRetention": {
                                "Mode": "GOVERNANCE"
                                if config.RetentionMode == "GOVERNANCE"
                                else "COMPLIANCE",
                                "Years": config.RetentionValidity,
                            }
                        },
                    },
                )
                res = config
            except s3.exceptions.ClientError:
                pass
    return res


@router.get(
    "/{bucket_name}/tagging",
    response_model=List[Tag],
    responses=s3gw_client_responses(),
)
async def get_bucket_tagging(
    conn: S3GWClientDep, bucket_name: str
) -> List[Tag]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_tagging.html
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


@router.put(
    "/{bucket_name}/tagging",
    responses=s3gw_client_responses(),
)
async def set_bucket_tagging(
    conn: S3GWClientDep, bucket_name: str, tags: List[TagTypeDef]
) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_tagging.html
    """
    async with conn.conn() as s3:
        tag_set: TaggingTypeDef = {"TagSet": tags}
        await s3.put_bucket_tagging(Bucket=bucket_name, Tagging=tag_set)


@router.get(
    "/{bucket_name}/attributes",
    response_model=BucketAttributes,
    responses=s3gw_client_responses(),
)
async def get_bucket_attributes(
    conn: S3GWClientDep, bucket_name: str
) -> BucketAttributes:
    """
    Aggregating function to retrieve bucket related attributes:
        - Versioning
        - Tags
        - ObjectLock configuration
    """
    reqs = [
        get_bucket(bucket_name=bucket_name, conn=conn),
        get_bucket_versioning(bucket_name=bucket_name, conn=conn),
        get_bucket_object_lock_configuration(
            bucket_name=bucket_name, conn=conn
        ),
        get_bucket_tagging(bucket_name=bucket_name, conn=conn),
    ]
    reqs_res = await asyncio.gather(*reqs, return_exceptions=True)
    assert len(reqs_res) == 4

    gb_res, gbv_res, gbl_res, gbt_res = reqs_res

    if isinstance(gb_res, Exception):
        logger.error(f"unable to obtain bucket '{bucket_name}': {gb_res}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)
    elif isinstance(gbv_res, Exception):
        logger.error(
            f"unable to obtain bucket '{bucket_name}' versioning: {gbv_res}"
        )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)
    elif isinstance(gbl_res, Exception):
        logger.error(
            f"unable to obtain bucket '{bucket_name}' object lock config:"
            "{gbl_res}"
        )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)
    elif isinstance(gbt_res, Exception):
        logger.error(f"unable to obtain bucket '{bucket_name}' tags: {gbt_res}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)

    res = BucketAttributes.parse_obj(
        gb_res.dict() | gbl_res.dict() | {"TagSet": gbt_res}
    )
    res.VersioningEnabled = gbv_res
    return res


@router.get(
    "/{bucket_name}/exists",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def bucket_exists(conn: S3GWClientDep, bucket_name: str) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/head_bucket.html
    """
    async with conn.conn() as s3:
        try:
            await s3.head_bucket(Bucket=bucket_name)
        except s3.exceptions.ClientError:
            return False
    return True