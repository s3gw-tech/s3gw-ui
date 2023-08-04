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
from collections import deque
from typing import Annotated, Deque, Dict, List, Optional

import pydash
from fastapi import (
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.logger import logger
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRouter
from pydantic import parse_obj_as
from types_aiobotocore_s3.type_defs import (
    CommonPrefixTypeDef,
    CopyObjectOutputTypeDef,
    CopySourceTypeDef,
    DeleteMarkerEntryTypeDef,
    DeleteObjectOutputTypeDef,
    GetObjectOutputTypeDef,
    HeadObjectOutputTypeDef,
    ListObjectsV2OutputTypeDef,
    ListObjectVersionsOutputTypeDef,
    ObjectIdentifierTypeDef,
    ObjectLockRetentionTypeDef,
    ObjectTypeDef,
    ObjectVersionTypeDef,
)

from backend.api import S3GWClient, s3gw_client, s3gw_client_responses
from backend.api.types import (
    DeletedObject,
    DeleteObjectByPrefixRequest,
    DeleteObjectRequest,
    ListObjectsRequest,
    ListObjectVersionsRequest,
    Object,
    ObjectAttributes,
    ObjectLockLegalHold,
    ObjectRequest,
    ObjectVersion,
    RestoreObjectRequest,
    SetObjectLockLegalHoldRequest,
    SetObjectTaggingRequest,
    Tag,
)

router = APIRouter(prefix="/objects")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


def split_key(key: str, delimiter: str = "/") -> List[str]:
    if not key:
        return []
    parts: List[str] = key.strip(delimiter).split(delimiter)
    return [part for part in parts if part]


def build_key(
    key: str, prefix: Optional[str | List[str]] = None, delimiter: str = "/"
) -> str:
    parts: Deque[str] = deque(split_key(key, delimiter))
    if isinstance(prefix, str) and prefix:
        prefix = split_key(prefix, delimiter)
    if isinstance(prefix, List) and prefix:
        prefix.reverse()
        parts.extendleft(prefix)
    return delimiter.join(parts)


@router.get(
    "/{bucket_name}",
    response_model=Optional[List[Object]],
    responses=s3gw_client_responses(),
)
async def get_object_list(
    conn: S3GWClientDep,
    bucket_name: str,
    params: ListObjectsRequest = ListObjectsRequest(),
) -> Optional[List[Object]]:
    """
    Note that the returned objects contain only a fraction of the
    information as if you request the information of a single object
    via `GET /api/objects/<BUCKET_NAME>/object` or `get_object()`.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/list_objects_v2.html
    """
    async with conn.conn() as s3:
        try:
            res: List[Object] = []
            continuation_token: str = ""
            while True:
                s3_res: ListObjectsV2OutputTypeDef = await s3.list_objects_v2(
                    Bucket=bucket_name,
                    Prefix=params.Prefix,
                    Delimiter=params.Delimiter,
                    ContinuationToken=continuation_token,
                )
                content: ObjectTypeDef
                for content in s3_res.get("Contents", []):
                    res.append(
                        parse_obj_as(
                            Object,
                            {
                                "Name": split_key(content["Key"]).pop(),
                                "Type": "OBJECT",
                                **content,
                            },
                        )
                    )
                cp: CommonPrefixTypeDef
                for cp in s3_res.get("CommonPrefixes", []):
                    res.append(
                        Object(
                            Key=build_key(cp["Prefix"]),
                            Name=split_key(cp["Prefix"]).pop(),
                            Type="FOLDER",
                        )
                    )
                if not s3_res.get("IsTruncated", False):
                    break
                continuation_token = s3_res["NextContinuationToken"]
        except s3.exceptions.ClientError:
            return None
    return res


@router.head(
    "/{bucket_name}/object",
    responses=s3gw_client_responses(),
)
async def object_exists(
    conn: S3GWClientDep, bucket_name: str, params: ObjectRequest
) -> Response:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/head_object.html
    """
    async with conn.conn() as s3:
        # `head_object` will throw an exception if the object does not exist.
        await s3.head_object(
            Bucket=bucket_name, Key=params.Key, VersionId=params.VersionId
        )
    return Response(content="", status_code=status.HTTP_200_OK)


@router.get(
    "/{bucket_name}/object",
    response_model=Object,
    responses=s3gw_client_responses(),
)
async def head_object(
    conn: S3GWClientDep, bucket_name: str, params: ObjectRequest
) -> Object:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/head_object.html
    """
    async with conn.conn() as s3:
        s3_res: HeadObjectOutputTypeDef = await s3.head_object(
            Bucket=bucket_name, Key=params.Key, VersionId=params.VersionId
        )
        res = Object.parse_obj(
            {
                "Key": params.Key,
                "Name": split_key(params.Key).pop(),
                "Type": "OBJECT",
                "Size": s3_res["ContentLength"],
                **s3_res,
            }
        )
    return res


@router.get(
    "/{bucket_name}/tags",
    response_model=List[Tag],
    responses=s3gw_client_responses(),
)
async def get_object_tagging(
    conn: S3GWClientDep, bucket_name: str, params: ObjectRequest
) -> List[Tag]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_tagging.html
    """
    async with conn.conn() as s3:
        try:
            s3_res = await s3.get_object_tagging(
                Bucket=bucket_name, Key=params.Key, VersionId=params.VersionId
            )
            res = parse_obj_as(List[Tag], s3_res["TagSet"])
        except s3.exceptions.ClientError as err:
            if err.response["Error"]["Code"] == "NoSuchTagSet":
                res = []
            else:
                raise err
    return res


@router.put(
    "/{bucket_name}/tags",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def set_object_tagging(
    conn: S3GWClientDep, bucket_name: str, params: SetObjectTaggingRequest
) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_object_tagging.html
    """
    async with conn.conn() as s3:
        try:
            params_raw = params.dict()
            await s3.put_object_tagging(
                Bucket=bucket_name,
                Key=params.Key,
                VersionId=params.VersionId,
                Tagging={"TagSet": params_raw["TagSet"]},
            )
        except s3.exceptions.ClientError:
            return False
    return True


@router.get(
    "/{bucket_name}/retention",
    response_model=Optional[ObjectLockRetentionTypeDef],
    responses=s3gw_client_responses(),
)
async def get_object_retention(
    conn: S3GWClientDep, bucket_name: str, params: ObjectRequest
) -> Optional[ObjectLockRetentionTypeDef]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_retention.html
    """
    async with conn.conn() as s3:
        try:
            s3_res = await s3.get_object_retention(
                Bucket=bucket_name, Key=params.Key, VersionId=params.VersionId
            )
            res = None
            if "Retention" in s3_res:
                res = parse_obj_as(
                    ObjectLockRetentionTypeDef, s3_res["Retention"]
                )
        except s3.exceptions.ClientError as err:
            if (
                err.response["Error"]["Code"]
                == "ObjectLockConfigurationNotFoundError"
            ):
                res = None
            else:
                raise err
    return res


@router.get(
    "/{bucket_name}/legal-hold",
    response_model=Optional[ObjectLockLegalHold],
    responses=s3gw_client_responses(),
)
async def get_object_legal_hold(
    conn: S3GWClientDep, bucket_name: str, params: ObjectRequest
) -> Optional[ObjectLockLegalHold]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_legal_hold.html
    """
    async with conn.conn() as s3:
        try:
            s3_res = await s3.get_object_legal_hold(
                Bucket=bucket_name, Key=params.Key, VersionId=params.VersionId
            )
            res = None
            if "LegalHold" in s3_res:
                res = ObjectLockLegalHold.parse_obj(s3_res["LegalHold"])
        except s3.exceptions.ClientError as err:
            if (
                err.response["Error"]["Code"]
                == "ObjectLockConfigurationNotFoundError"
            ):
                res = None
            else:
                raise err
    return res


@router.put(
    "/{bucket_name}/legal-hold",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def set_object_legal_hold(
    conn: S3GWClientDep, bucket_name: str, params: SetObjectLockLegalHoldRequest
) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_object_legal_hold.html
    """
    async with conn.conn() as s3:
        try:
            params_raw = params.dict()
            await s3.put_object_legal_hold(
                Bucket=bucket_name,
                Key=params.Key,
                VersionId=params.VersionId,
                LegalHold=params_raw["LegalHold"],
            )
        except s3.exceptions.ClientError:
            return False
    return True


@router.get(
    "/{bucket_name}/attributes",
    summary="Get aggregated object attributes",
    response_model=ObjectAttributes,
    responses=s3gw_client_responses(),
)
async def get_object_attributes(
    conn: S3GWClientDep, bucket_name: str, params: ObjectRequest
) -> ObjectAttributes:
    """
    Aggregating function to retrieve object related attributes:
        - Get Object
        - Tags
    """
    reqs = [
        head_object(conn=conn, bucket_name=bucket_name, params=params),
        get_object_tagging(conn=conn, bucket_name=bucket_name, params=params),
    ]
    reqs_res = await asyncio.gather(*reqs, return_exceptions=True)
    assert len(reqs_res) == 2

    go_res, got_res = reqs_res

    if isinstance(go_res, Exception):
        logger.error(
            f"unable to obtain object '{params.Key}' "
            f"in '{bucket_name}': {go_res}"
        )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)
    elif isinstance(got_res, Exception):
        logger.error(
            f"unable to obtain tags from object '{params.Key}' "
            f"in '{bucket_name}': {got_res}"
        )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)

    res = ObjectAttributes.parse_obj(go_res.dict() | {"TagSet": got_res})
    return res


@router.get(
    "/{bucket_name}/versions",
    response_model=Optional[List[ObjectVersion]],
    responses=s3gw_client_responses(),
)
async def get_object_versions_list(
    conn: S3GWClientDep,
    bucket_name: str,
    params: ListObjectVersionsRequest = ListObjectVersionsRequest(),
) -> Optional[List[ObjectVersion]]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/list_object_versions.html
    """
    async with conn.conn() as s3:
        try:
            res: List[ObjectVersion] = []
            key_marker: str = ""
            while True:
                s3_res: ListObjectVersionsOutputTypeDef = (
                    await s3.list_object_versions(
                        Bucket=bucket_name,
                        Prefix=params.Prefix,
                        Delimiter=params.Delimiter,
                        KeyMarker=key_marker,
                    )
                )
                version: ObjectVersionTypeDef
                for version in s3_res.get("Versions", []):
                    res.append(
                        parse_obj_as(
                            ObjectVersion,
                            {
                                "Name": split_key(version["Key"]).pop(),
                                "Type": "OBJECT",
                                "IsDeleted": False,
                                **version,
                            },
                        )
                    )
                cp: CommonPrefixTypeDef
                for cp in s3_res.get("CommonPrefixes", []):
                    res.append(
                        ObjectVersion(
                            Key=build_key(cp["Prefix"]),
                            Name=split_key(cp["Prefix"]).pop(),
                            Type="FOLDER",
                            IsDeleted=False,
                            IsLatest=True,
                        )
                    )
                    dm: DeleteMarkerEntryTypeDef
                for dm in s3_res.get("DeleteMarkers", []):
                    res.append(
                        ObjectVersion.parse_obj(
                            {
                                "Name": split_key(dm["Key"]).pop(),
                                "Type": "OBJECT",
                                "Size": 0,
                                "IsDeleted": True,
                                "IsLatest": True,
                                **dm,
                            }
                        )
                    )
                if not s3_res.get("IsTruncated", False):
                    break
                key_marker = s3_res["NextKeyMarker"]
        except s3.exceptions.ClientError:
            return None
    return res


@router.put(
    "/{bucket_name}/restore",
    response_model=Object,
    responses=s3gw_client_responses(),
)
async def restore_object(
    conn: S3GWClientDep, bucket_name: str, params: RestoreObjectRequest
) -> Object:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/copy_object.html
    """
    async with conn.conn() as s3:
        copy_source: CopySourceTypeDef = {
            "Bucket": bucket_name,
            "Key": params.Key,
        }
        if params.VersionId:
            copy_source["VersionId"] = params.VersionId
        s3_res: CopyObjectOutputTypeDef = await s3.copy_object(
            Bucket=bucket_name,
            CopySource=copy_source,
            Key=params.Key,
            MetadataDirective="COPY",
            TaggingDirective="COPY",
        )
        res = Object(
            Name=split_key(params.Key).pop(),
            Key=params.Key,
            ETag=pydash.get(s3_res, "CopyObjectResult.ETag"),
            LastModified=pydash.get(s3_res, "CopyObjectResult.LastModified"),
        )
    return res


@router.delete(
    "/{bucket_name}/object",
    response_model=DeletedObject,
    responses=s3gw_client_responses(),
)
async def delete_object(
    conn: S3GWClientDep, bucket_name: str, params: DeleteObjectRequest
) -> DeletedObject:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_object.html
    """
    async with conn.conn() as s3:
        s3_res: DeleteObjectOutputTypeDef = await s3.delete_object(
            Bucket=bucket_name,
            Key=params.Key,
            VersionId=params.VersionId,
        )
        res = DeletedObject(
            Key=params.Key,
            VersionId=s3_res["VersionId"],
            DeleteMarker=s3_res["DeleteMarker"],
        )
    return res


@router.delete(
    "/{bucket_name}/object-by-prefix",
    response_model=List[DeletedObject],
    responses=s3gw_client_responses(),
)
async def delete_object_by_prefix(
    conn: S3GWClientDep, bucket_name: str, params: DeleteObjectByPrefixRequest
) -> List[DeletedObject]:
    """
    Delete one or more object(s) by prefix. If the specified prefix is
    a "virtual folder", e.g. `a/b/`, then all objects with that prefix
    (e.g. a/b/file1.txt, a/b/c/d/foo.md) are deleted as well.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_object.html
    """

    async def collect_objects(prefix: str) -> List[ObjectIdentifierTypeDef]:
        res: Optional[List[ObjectVersion]] = await get_object_versions_list(
            conn,
            bucket_name,
            ListObjectVersionsRequest(
                Prefix=prefix, Delimiter=params.Delimiter
            ),
        )
        obj: ObjectVersion
        res_objects: List[ObjectIdentifierTypeDef] = []
        for obj in res or []:
            if not (params.AllVersions or (obj.IsLatest and not obj.IsDeleted)):
                continue
            if obj.Type == "OBJECT":
                # This is a regular object.
                version_id: str = (
                    obj.VersionId
                    if params.AllVersions and obj.VersionId
                    else ""
                )
                res_objects.append({"Key": obj.Key, "VersionId": version_id})
            else:
                # This is a "virtual folder".
                res_objects.extend(
                    await collect_objects(f"{obj.Key}{params.Delimiter}")
                )
        return res_objects

    # Collect all objects that are going to be deleted.
    objects: List[ObjectIdentifierTypeDef] = await collect_objects(
        params.Prefix
    )

    async with conn.conn() as s3:
        s3_res = await s3.delete_objects(
            Bucket=bucket_name, Delete={"Objects": objects}
        )
    return [DeletedObject.parse_obj(deleted) for deleted in s3_res["Deleted"]]


@router.get(
    "/{bucket_name}/download",
    summary="Download an object",
    response_class=StreamingResponse,
    responses=s3gw_client_responses(),
)
async def download_object(
    conn: S3GWClientDep, bucket_name: str, params: ObjectRequest
) -> StreamingResponse:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object.html
    """

    async def stream_object():
        async with conn.conn() as s3:
            s3_res: GetObjectOutputTypeDef = await s3.get_object(
                Bucket=bucket_name, Key=params.Key, VersionId=params.VersionId
            )
            async for chunk in s3_res["Body"]:
                yield chunk

    obj_info: Object = await head_object(conn, bucket_name, params)
    filename: str = split_key(params.Key).pop()
    headers: Dict[str, str] = {
        "content-disposition": f"attachment; filename={filename}",
    }
    if obj_info.Size is not None:
        headers["content-length"] = str(obj_info.Size)
    if obj_info.ETag is not None:
        headers["etag"] = obj_info.ETag
    return StreamingResponse(
        content=stream_object(),
        media_type=obj_info.ContentType or "application/octet-stream",
        headers=headers,
    )


@router.post(
    "/{bucket_name}/upload",
    summary="Upload an object",
    responses=s3gw_client_responses(),
)
async def upload_object(
    conn: S3GWClientDep,
    bucket_name: str,
    key: str = Form(...),
    file: UploadFile = File(...),
) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/upload_fileobj.html
    """
    async with conn.conn() as s3:
        await s3.upload_fileobj(Fileobj=file.file, Bucket=bucket_name, Key=key)
