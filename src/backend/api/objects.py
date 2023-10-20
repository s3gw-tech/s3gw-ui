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
from typing import Annotated, Any, Deque, List, Optional

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
from starlette.types import Send
from types_aiobotocore_s3.type_defs import (
    CommonPrefixTypeDef,
    CopySourceTypeDef,
    DeleteMarkerEntryTypeDef,
    DeleteObjectOutputTypeDef,
    DeleteObjectsOutputTypeDef,
    GetObjectOutputTypeDef,
    HeadObjectOutputTypeDef,
    ListObjectsV2OutputTypeDef,
    ListObjectVersionsOutputTypeDef,
    ObjectIdentifierTypeDef,
    ObjectLockLegalHoldTypeDef,
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


class ObjectBodyStreamingResponse(StreamingResponse):
    """
    Helper class to stream the object body.
    """

    def __init__(self, conn: S3GWClientDep, bucket: str, params: ObjectRequest):
        # Note, do not call the parent class constructor which does some
        # initializations that we don't want at the moment. These are
        # done at a later stage, e.g. in the `stream_response` method.
        self._conn = conn
        self._bucket = bucket
        self._params = params
        self.status_code = 200
        self.background = None

    async def stream_response(self, send: Send) -> None:
        # We need to fetch the object to be able to stream it later and
        # to populate the response header with information of the object,
        # e.g. content type, size or ETag.
        async with self._conn.conn() as s3:
            s3_res: GetObjectOutputTypeDef = await s3.get_object(
                Bucket=self._bucket,
                Key=self._params.Key,
                VersionId=self._params.VersionId,
            )

            filename: str = split_key(self._params.Key).pop()
            headers = {
                "content-length": str(s3_res["ContentLength"]),
                "content-disposition": f"attachment; filename={filename}",
            }
            if "ETag" in s3_res:
                headers["etag"] = s3_res["ETag"]

            # Set the properties of the class and initialize the headers.
            # This is usually all done in the `StreamingResponse` class
            # constructor, but the necessary information is only available
            # after the object has been fetched via S3 API. So we need to
            # do the necessary work right here afterward.
            self.body_iterator = s3_res["Body"]
            self.media_type = s3_res["ContentType"]
            self.init_headers(headers)

            # Finally call the method of the derived class.
            await super().stream_response(send)


@router.post(
    "/{bucket}",
    response_model=Optional[List[Object]],
    responses=s3gw_client_responses(),
)
async def list_objects(
    conn: S3GWClientDep,
    bucket: str,
    params: ListObjectsRequest = ListObjectsRequest(),
) -> Optional[List[Object]]:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ListObjectsRequest` need to
    be in the request `body` as these may exceed the maximum allowed
    length of a URL.

    Note that the returned objects contain only a fraction of the
    information as if you request the information of a single object
    via `POST /api/objects/<bucket>/object` or `get_object()`.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/list_objects_v2.html
    """
    async with conn.conn() as s3:
        try:
            res: List[Object] = []
            continuation_token: str = ""
            while True:
                s3_res: ListObjectsV2OutputTypeDef = await s3.list_objects_v2(
                    Bucket=bucket,
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


@router.post(
    "/{bucket}/versions",
    response_model=Optional[List[ObjectVersion]],
    responses=s3gw_client_responses(),
)
async def list_object_versions(
    conn: S3GWClientDep,
    bucket: str,
    params: ListObjectVersionsRequest = ListObjectVersionsRequest(),
) -> Optional[List[ObjectVersion]]:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ListObjectVersionsRequest`
    need to be in the request `body` as these may exceed the maximum
    allowed length of a URL.

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
                        Bucket=bucket,
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


@router.post(
    "/{bucket}/exists",
    responses=s3gw_client_responses(),
)
async def object_exists(
    conn: S3GWClientDep, bucket: str, params: ObjectRequest
) -> Response:
    """
    Note that this is a POST request instead of a usual HEAD request
    because the parameters specified in `ObjectRequest` need to be in
    the request `body` as these may exceed the maximum allowed length
    of a URL.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/head_object.html
    """
    async with conn.conn() as s3:
        # `head_object` will throw an exception if the object does not exist.
        await s3.head_object(
            Bucket=bucket, Key=params.Key, VersionId=params.VersionId
        )
    return Response(content="", status_code=status.HTTP_200_OK)


@router.post(
    "/{bucket}/get",
    response_model=Object,
    responses=s3gw_client_responses(),
)
async def get_object(
    conn: S3GWClientDep, bucket: str, params: ObjectRequest
) -> Object:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ObjectRequest` need to be in
    the request `body` as these may exceed the maximum allowed length
    of a URL.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/head_object.html
    """
    async with conn.conn() as s3:
        s3_res: HeadObjectOutputTypeDef = await s3.head_object(
            Bucket=bucket, Key=params.Key, VersionId=params.VersionId
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


@router.post(
    "/{bucket}/tags",
    response_model=List[Tag],
    responses=s3gw_client_responses(),
)
async def get_object_tagging(
    conn: S3GWClientDep, bucket: str, params: ObjectRequest
) -> List[Tag]:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ObjectRequest` need to be in
    the request `body` as these may exceed the maximum allowed length
    of a URL.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_tagging.html
    """
    async with conn.conn() as s3:
        try:
            s3_res = await s3.get_object_tagging(
                Bucket=bucket, Key=params.Key, VersionId=params.VersionId
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
async def set_object_tagging(
    conn: S3GWClientDep, bucket: str, params: SetObjectTaggingRequest
) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_object_tagging.html
    """
    async with conn.conn() as s3:
        try:
            params_raw = params.dict()
            await s3.put_object_tagging(
                Bucket=bucket,
                Key=params.Key,
                VersionId=params.VersionId,
                Tagging={"TagSet": params_raw["TagSet"]},
            )
        except s3.exceptions.ClientError:
            return False
    return True


@router.post(
    "/{bucket}/retention",
    response_model=Optional[ObjectLockRetentionTypeDef],
    responses=s3gw_client_responses(),
)
async def get_object_retention(
    conn: S3GWClientDep, bucket: str, params: ObjectRequest
) -> Optional[ObjectLockRetentionTypeDef]:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ObjectRequest` need to be in
    the request `body` as these may exceed the maximum allowed length
    of a URL.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_retention.html
    """
    async with conn.conn() as s3:
        try:
            s3_res = await s3.get_object_retention(
                Bucket=bucket, Key=params.Key, VersionId=params.VersionId
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


@router.post(
    "/{bucket}/legal-hold",
    response_model=Optional[ObjectLockLegalHold],
    responses=s3gw_client_responses(),
)
async def get_object_legal_hold(
    conn: S3GWClientDep, bucket: str, params: ObjectRequest
) -> Optional[ObjectLockLegalHold]:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ObjectRequest` need to be in
    the request `body` as these may exceed the maximum allowed length
    of a URL.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object_legal_hold.html
    """
    async with conn.conn() as s3:
        try:
            s3_res = await s3.get_object_legal_hold(
                Bucket=bucket, Key=params.Key, VersionId=params.VersionId
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
    "/{bucket}/legal-hold",
    response_model=bool,
    responses=s3gw_client_responses(),
)
async def set_object_legal_hold(
    conn: S3GWClientDep, bucket: str, params: SetObjectLockLegalHoldRequest
) -> bool:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_object_legal_hold.html
    """
    async with conn.conn() as s3:
        try:
            await s3.put_object_legal_hold(
                Bucket=bucket,
                Key=params.Key,
                VersionId=params.VersionId,
                LegalHold=parse_obj_as(
                    ObjectLockLegalHoldTypeDef, params.LegalHold.dict()
                ),
            )
        except s3.exceptions.ClientError:
            return False
    return True


@router.post(
    "/{bucket}/attributes",
    summary="Get aggregated object attributes",
    response_model=ObjectAttributes,
    responses=s3gw_client_responses(),
)
async def get_object_attributes(
    conn: S3GWClientDep, bucket: str, params: ObjectRequest
) -> ObjectAttributes:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ObjectRequest` need to be in
    the request `body` as these may exceed the maximum allowed length
    of a URL.

    Aggregating function to retrieve object related attributes:
        - Get Object
        - Tags
    """
    reqs = [
        get_object(conn=conn, bucket=bucket, params=params),
        get_object_tagging(conn=conn, bucket=bucket, params=params),
    ]
    reqs_res: list[Any] = await asyncio.gather(*reqs, return_exceptions=True)
    assert len(reqs_res) == 2

    go_res, got_res = reqs_res

    if isinstance(go_res, Exception):
        logger.error(
            f"Unable to obtain object '{params.Key}' "
            f"in '{bucket}': {go_res}"
        )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)
    elif isinstance(got_res, Exception):
        logger.error(
            f"Unable to obtain tags from object '{params.Key}' "
            f"in '{bucket}': {got_res}"
        )
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR)

    res = ObjectAttributes.parse_obj(go_res.dict() | {"TagSet": got_res})
    return res


@router.put(
    "/{bucket}/restore",
    responses=s3gw_client_responses(),
    status_code=status.HTTP_204_NO_CONTENT,
)
async def restore_object(
    conn: S3GWClientDep, bucket: str, params: RestoreObjectRequest
) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/copy_object.html
    https://docs.aws.amazon.com/AmazonS3/latest/userguide/RestoringPreviousVersions.html
    https://repost.aws/knowledge-center/s3-undelete-configuration
    https://www.middlewareinventory.com/blog/recover-s3/
    """
    async with conn.conn() as s3:
        # Remove existing deletion markers.
        s3_res = await s3.list_object_versions(Bucket=bucket, Prefix=params.Key)
        del_objects: List[ObjectIdentifierTypeDef] = []
        dm = DeleteMarkerEntryTypeDef
        for dm in s3_res.get("DeleteMarkers", []):
            if dm["IsLatest"]:
                del_objects.append(
                    {"Key": dm["Key"], "VersionId": dm["VersionId"]}
                )
        if del_objects:
            await s3.delete_objects(
                Bucket=bucket,
                Delete={"Objects": del_objects, "Quiet": True},
            )
        # Make a copy of the object to restore.
        copy_source: CopySourceTypeDef = {
            "Bucket": bucket,
            "Key": params.Key,
        }
        if params.VersionId:
            copy_source["VersionId"] = params.VersionId
        await s3.copy_object(
            Bucket=bucket,
            CopySource=copy_source,
            Key=params.Key,
            MetadataDirective="COPY",
            TaggingDirective="COPY",
        )


@router.delete(
    "/{bucket}/delete",
    response_model=DeletedObject,
    responses=s3gw_client_responses(),
)
async def delete_object(
    conn: S3GWClientDep, bucket: str, params: DeleteObjectRequest
) -> DeletedObject:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_object.html
    https://www.middlewareinventory.com/blog/recover-s3/
    """
    async with conn.conn() as s3:
        s3_res: DeleteObjectOutputTypeDef = await s3.delete_object(
            Bucket=bucket,
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
    "/{bucket}/delete-by-prefix",
    response_model=List[DeletedObject],
    responses=s3gw_client_responses(),
)
async def delete_object_by_prefix(
    conn: S3GWClientDep, bucket: str, params: DeleteObjectByPrefixRequest
) -> List[DeletedObject]:
    """
    Delete one or more object(s) by prefix. If the specified prefix is
    a "virtual folder", e.g. `a/b/`, then all objects with that prefix
    (e.g. a/b/file1.txt, a/b/c/d/foo.md) are deleted as well.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/delete_objects.html
    """

    async def collect_objects(prefix: str) -> List[ObjectIdentifierTypeDef]:
        res: Optional[List[ObjectVersion]] = await list_object_versions(
            conn,
            bucket,
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
        s3_res: DeleteObjectsOutputTypeDef = await s3.delete_objects(
            Bucket=bucket, Delete={"Objects": objects}
        )

    # Handle errors.
    if "Errors" in s3_res and s3_res["Errors"]:
        reasons = [
            f"{obj.get('Key', 'n/a')} ({obj.get('Code', 'n/a')})"
            for obj in s3_res["Errors"]
        ]
        detail = f"Could not delete object(s) {', '.join(reasons)}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
        )

    res = []

    if "Deleted" in s3_res and s3_res["Deleted"]:
        res = [
            DeletedObject.parse_obj(deleted) for deleted in s3_res["Deleted"]
        ]

    return res


@router.post(
    "/{bucket}/download",
    summary="Download an object",
    response_class=ObjectBodyStreamingResponse,
    responses=s3gw_client_responses(),
)
async def download_object(
    conn: S3GWClientDep, bucket: str, params: ObjectRequest
) -> ObjectBodyStreamingResponse:
    """
    Note that this is a POST request instead of a usual GET request
    because the parameters specified in `ObjectRequest` need to be in
    the request `body` as these may exceed the maximum allowed length
    of a URL.

    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/get_object.html
    """
    return ObjectBodyStreamingResponse(conn, bucket, params)


@router.post(
    "/{bucket}/upload",
    summary="Upload an object",
    responses=s3gw_client_responses(),
    status_code=status.HTTP_204_NO_CONTENT,
)
async def upload_object(
    conn: S3GWClientDep,
    bucket: str,
    key: str = Form(...),
    file: UploadFile = File(...),
) -> None:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/upload_fileobj.html
    """
    async with conn.conn() as s3:
        await s3.upload_fileobj(Fileobj=file.file, Bucket=bucket, Key=key)
