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

from typing import Annotated, Optional

from fastapi import Depends
from fastapi.routing import APIRouter
from types_aiobotocore_s3.type_defs import ListObjectsV2OutputTypeDef

from backend.api import S3GWClient, s3gw_client, s3gw_client_responses

router = APIRouter(prefix="/object")

S3GWClientDep = Annotated[S3GWClient, Depends(s3gw_client)]


@router.get(
    "/list",
    response_model=Optional[ListObjectsV2OutputTypeDef],
    responses=s3gw_client_responses(),
)
async def get_object_list(
    conn: S3GWClientDep, bucket_name: str, prefix: Optional[str] = None
) -> Optional[ListObjectsV2OutputTypeDef]:
    """
    See
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/list_objects_v2.html
    """
    async with conn.conn() as s3:
        try:
            res: ListObjectsV2OutputTypeDef = await s3.list_objects_v2(
                Bucket=bucket_name, Prefix=prefix if prefix is not None else ""
            )
        except s3.exceptions.ClientError:
            return None
    return res
