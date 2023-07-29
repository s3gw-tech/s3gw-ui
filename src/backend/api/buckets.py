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
from fastapi import Depends, HTTPException, Response, status
from fastapi.logger import logger
from fastapi.routing import APIRouter
from pydantic import parse_obj_as
from types_aiobotocore_s3.type_defs import (
    BucketLifecycleConfigurationTypeDef,
    GetBucketLifecycleConfigurationOutputTypeDef,
    GetBucketTaggingOutputTypeDef,
    GetBucketVersioningOutputTypeDef,
    GetObjectLockConfigurationOutputTypeDef,
    ListBucketsOutputTypeDef,
    ObjectLockConfigurationTypeDef,
)

from backend.api import S3GWClient, s3gw_client, s3gw_client_responses
from backend.api.types import (
    Bucket,
    BucketAttributes,
    BucketObjectLock,
    Tag,
    TagSet,
)

router = APIRouter(prefix="/buckets", tags=["bucket"])

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
        s3_res: ListBucketsOutputTypeDef = await s3.list_buckets()
        res = parse_obj_as(List[Bucket], s3_res["Buckets"])
    return res


@router.put(
    "/",
    responses=s3gw_client_responses(),
    status_code=status.HTTP_201_CREATED,
)
async def create_bucket(
    conn: S3GWClientDep,
    bucket: str,
    enable_object_locking: bool = False,
) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/create_bucket.html
    """
    async with conn.conn() as s3:
        try:
            await s3.create_bucket(
                Bucket=bucket,
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
    "/{bucket}",
    responses=s3gw_client_responses(),
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_bucket(conn: S3GWClientDep, bucket: str) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_bucket.html
    """
    async with conn.conn() as s3:
        await s3.delete_bucket(Bucket=bucket)


@router.get(
    "/{bucket}/versioning",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def get_bucket_versioning(conn: S3GWClientDep, bucket: str) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_versioning.html
    """
    async with conn.conn() as s3:
        s3_res: GetBucketVersioningOutputTypeDef = (
            await s3.get_bucket_versioning(Bucket=bucket)
        )
        res = pydash.get(s3_res, "Status", "Suspended") == "Enabled"
    return res


@router.put(
    "/{bucket}/versioning",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def set_bucket_versioning(
    conn: S3GWClientDep, bucket: str, enabled: bool
) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_versioning.html

    :return: Returns `True` on success, otherwise `False`.
    """
    async with conn.conn() as s3:
        vc = {"Status": "Enabled" if enabled else "Suspended"}
        try:
            await s3.put_bucket_versioning(
                Bucket=bucket, VersioningConfiguration=vc  # type: ignore
            )
        except s3.exceptions.ClientError:
            return False
    return True


@router.get(
    "/{bucket}/object-lock",
    response_model=BucketObjectLock,
    responses=s3gw_client_responses(),
)
async def get_bucket_object_lock_configuration(
    conn: S3GWClientDep, bucket: str
) -> BucketObjectLock:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_lock_configuration.html
    """
    async with conn.conn() as s3:
        try:
            s3_res: GetObjectLockConfigurationOutputTypeDef = (
                await s3.get_object_lock_configuration(Bucket=bucket)
            )
            res = BucketObjectLock(
                ObjectLockEnabled=pydash.get(
                    s3_res, "ObjectLockConfiguration.ObjectLockEnabled"
                )
                == "Enabled",
                RetentionEnabled=pydash.has(
                    s3_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Mode",
                ),
                RetentionMode=pydash.get(
                    s3_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Mode",
                ),
                RetentionValidity=pydash.get(
                    s3_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Years",
                    0,
                )
                or pydash.get(
                    s3_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Days",
                    None,
                ),
                RetentionUnit="Years"
                if pydash.get(
                    s3_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Years",
                    0,
                )
                else "Days"
                if pydash.get(
                    s3_res,
                    "ObjectLockConfiguration.Rule.DefaultRetention.Days",
                    0,
                )
                else None,
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
    "/{bucket}/object-lock",
    response_model=BucketObjectLock,
    responses=s3gw_client_responses(),
)
async def set_bucket_object_lock_configuration(
    conn: S3GWClientDep, bucket: str, config: BucketObjectLock
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
                olc: ObjectLockConfigurationTypeDef = {
                    "ObjectLockEnabled": "Enabled"
                }
                if config.RetentionEnabled:
                    olc["Rule"] = {
                        "DefaultRetention": {
                            "Mode": config.RetentionMode,
                            "Days": config.RetentionValidity,
                        }
                        if config.RetentionUnit == "Days"
                        else {
                            "Mode": config.RetentionMode,
                            "Years": config.RetentionValidity,
                        }
                    }
                await s3.put_object_lock_configuration(
                    Bucket=bucket,
                    ObjectLockConfiguration=olc,
                )
                res = config
            except s3.exceptions.ClientError:
                pass
    return res


@router.get(
    "/{bucket}/tags",
    response_model=List[Tag],
    responses=s3gw_client_responses(),
)
async def get_bucket_tagging(conn: S3GWClientDep, bucket: str) -> List[Tag]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_tagging.html
    """
    async with conn.conn() as s3:
        try:
            s3_res: GetBucketTaggingOutputTypeDef = await s3.get_bucket_tagging(
                Bucket=bucket
            )
            res = parse_obj_as(List[Tag], s3_res["TagSet"])
        except s3.exceptions.ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchTagSet":
                res = []
            else:
                raise err
    return res


@router.put(
    "/{bucket}/tags",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def set_bucket_tagging(
    conn: S3GWClientDep, bucket: str, tag_set: TagSet
) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_tagging.html

    :return: Returns `True` on success, otherwise `False`.
    """
    async with conn.conn() as s3:
        try:
            await s3.put_bucket_tagging(
                Bucket=bucket, Tagging=tag_set.dict()  # pyright: ignore
            )
        except s3.exceptions.ClientError:
            return False
    return True


@router.get(
    "/{bucket}/attributes",
    name="get_bucket_attributes",
    summary="Get aggregated bucket attributes",
    response_model=BucketAttributes,
    responses=s3gw_client_responses(),
)
async def get_bucket_attributes(
    conn: S3GWClientDep, bucket: str
) -> BucketAttributes:
    """
    Aggregating function to retrieve bucket related attributes:
        - Versioning
        - Tags
        - ObjectLock configuration
    """
    reqs = [
        get_bucket_versioning(conn=conn, bucket=bucket),
        get_bucket_object_lock_configuration(conn=conn, bucket=bucket),
        get_bucket_tagging(conn=conn, bucket=bucket),
    ]
    reqs_res = await asyncio.gather(*reqs, return_exceptions=True)
    assert len(reqs_res) == 3

    gbv_res, gbl_res, gbt_res = reqs_res

    if isinstance(gbv_res, Exception):
        detail = (
            f"Unable to obtain versioning from bucket '{bucket}': {gbv_res}"
        )
        logger.error(detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
        )
    elif isinstance(gbl_res, Exception):
        detail = (
            f"Unable to obtain object lock configuration from "
            f"bucket '{bucket}': {gbl_res}"
        )
        logger.error(detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
        )
    elif isinstance(gbt_res, Exception):
        detail = f"Unable to obtain tags from bucket '{bucket}': {gbt_res}"
        logger.error(detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
        )

    res = BucketAttributes.parse_obj(
        {"Name": bucket} | gbl_res.dict() | {"TagSet": gbt_res}
    )
    res.VersioningEnabled = gbv_res
    return res


@router.head(
    "/{bucket}",
    responses=s3gw_client_responses(),
)
async def bucket_exists(conn: S3GWClientDep, bucket: str) -> Response:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/head_bucket.html
    """
    async with conn.conn() as s3:
        await s3.head_bucket(Bucket=bucket)
    return Response(content="", status_code=status.HTTP_200_OK)


@router.put(
    "/{bucket}",
    response_model=BucketAttributes,
    responses=s3gw_client_responses(),
)
async def update_bucket(
    conn: S3GWClientDep, bucket: str, attributes: BucketAttributes
) -> BucketAttributes:
    """
    Aggregating function to update bucket related attributes:
        - Versioning
        - Tags
        - ObjectLock configuration
    """
    old_attributes = await get_bucket_attributes(conn=conn, bucket=bucket)

    versioning_op_res = True

    # Versioning
    if attributes.VersioningEnabled is not None:
        if attributes.VersioningEnabled != old_attributes.VersioningEnabled:
            versioning_op_res = await set_bucket_versioning(
                conn=conn,
                bucket=bucket,
                enabled=attributes.VersioningEnabled,
            )

    tagging_op_res = True

    # Tags
    if set(attributes.TagSet) != set(old_attributes.TagSet):
        tagging_op_res = await set_bucket_tagging(
            conn=conn,
            bucket=bucket,
            tag_set=TagSet(TagSet=attributes.TagSet),
        )

    res_dict = {}

    # ObjectLock
    if (
        attributes.ObjectLockEnabled is not None
        and attributes.RetentionMode is not None
        and attributes.RetentionValidity is not None
        and attributes.RetentionUnit is not None
    ):
        if attributes.ObjectLockEnabled and (
            attributes.RetentionEnabled != old_attributes.RetentionEnabled
            or attributes.RetentionMode != old_attributes.RetentionMode
            or attributes.RetentionValidity != old_attributes.RetentionValidity
            or attributes.RetentionUnit != old_attributes.RetentionUnit
        ):
            res = await set_bucket_object_lock_configuration(
                conn=conn, bucket=bucket, config=attributes
            )
            res_dict = res.dict()

    res = BucketAttributes.parse_obj(attributes.dict() | res_dict)

    # if versioning_op_res is false,
    # set res.VersioningEnabled as the opposite of what requested
    res.VersioningEnabled = (
        res.VersioningEnabled
        if versioning_op_res
        else not res.VersioningEnabled
    )

    # if versioning_op_res is false,
    # set res.TagSet = old_attributes.TagSet
    res.TagSet = attributes.TagSet if tagging_op_res else old_attributes.TagSet

    return res


@router.get(
    "/{bucket}/lifecycle-configuration",
    response_model=BucketLifecycleConfigurationTypeDef,
    responses=s3gw_client_responses(),
)
async def get_bucket_lifecycle_configuration(
    conn: S3GWClientDep, bucket: str
) -> BucketLifecycleConfigurationTypeDef:
    """
    If there is no lifecycle configuration, an empty configuration is
    returned in any case.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_bucket_lifecycle_configuration.html
    """
    async with conn.conn() as s3:
        try:
            s3_res: GetBucketLifecycleConfigurationOutputTypeDef = (
                await s3.get_bucket_lifecycle_configuration(Bucket=bucket)
            )
            res = parse_obj_as(BucketLifecycleConfigurationTypeDef, s3_res)
        except s3.exceptions.ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchLifecycleConfiguration":
                res = parse_obj_as(
                    BucketLifecycleConfigurationTypeDef, {"Rules": []}
                )
            else:
                raise e
    return res


@router.put(
    "/{bucket}/lifecycle-configuration",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def set_bucket_lifecycle_configuration(
    conn: S3GWClientDep,
    bucket: str,
    config: BucketLifecycleConfigurationTypeDef,
) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_lifecycle_configuration.html
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_bucket_lifecycle.html

    :return: Returns `True` on success, otherwise `False`.
    """
    async with conn.conn() as s3:
        try:
            if len(config["Rules"]) > 0:
                await s3.put_bucket_lifecycle_configuration(
                    Bucket=bucket, LifecycleConfiguration=config
                )
            else:
                await s3.delete_bucket_lifecycle(Bucket=bucket)
        except s3.exceptions.ClientError:
            return False
    return True
