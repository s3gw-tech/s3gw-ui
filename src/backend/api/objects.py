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
from collections import deque
from typing import Annotated, Deque, List, Optional

from fastapi import Depends
from fastapi.routing import APIRouter
from pydantic import parse_obj_as
from types_aiobotocore_s3.type_defs import ListObjectsV2OutputTypeDef

from backend.api import S3GWClient, s3gw_client, s3gw_client_responses
from backend.api.types import Object

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
    prefix: Optional[str] = None,
    delimiter: str = "/",
) -> Optional[List[Object]]:
    """
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
                    Prefix=prefix if prefix is not None else "",
                    Delimiter=delimiter,
                    ContinuationToken=continuation_token,
                )
                for obj in s3_res.get("Contents", []):
                    res.append(
                        parse_obj_as(
                            Object,
                            {
                                "Name": split_key(obj["Key"]).pop(),
                                "Type": "OBJECT",
                                **obj,
                            },
                        )
                    )
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
