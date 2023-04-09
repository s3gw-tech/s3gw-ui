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

from fastapi import Depends
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
