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

from datetime import datetime as dt
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field
from types_aiobotocore_s3.literals import ObjectLockRetentionModeType
from types_aiobotocore_s3.type_defs import TagTypeDef


class QuotaInfo(BaseModel):
    enabled: bool
    check_on_raw: bool
    max_size: int
    max_size_kb: int
    max_objects: int


class UserStatistics(BaseModel):
    size: int
    size_actual: int
    size_utilized: int
    size_kb: int
    size_kb_actual: int
    size_kb_utilized: int
    num_objects: int


class UserKey(BaseModel):
    user: str
    access_key: str
    secret_key: str


class UserInfo(BaseModel):
    tenant: str
    user_id: str
    display_name: str
    email: str
    suspended: bool
    max_buckets: int
    subusers: List[Any]
    keys: List[UserKey]
    caps: List[Any]
    op_mask: str
    system: bool
    admin: bool
    bucket_quota: QuotaInfo
    user_quota: QuotaInfo
    stats: Optional[UserStatistics]


def to_dashes(s: str) -> str:
    return s.replace("_", "-")


class ParamsModel(BaseModel):
    class Config:
        alias_generator = to_dashes
        allow_population_by_field_name = True


class UserOpParams(ParamsModel):
    uid: str
    display_name: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    key_type: Optional[str] = Field(default="s3")
    access_key: Optional[str] = Field(default=None)
    secret_key: Optional[str] = Field(default=None)
    user_caps: Optional[str] = Field(default=None)
    generate_key: Optional[bool] = Field(default=None)
    max_buckets: Optional[int] = Field(default=None)
    suspended: Optional[bool] = Field(default=None)
    admin: Optional[bool] = Field(default=None)
    tenant: Optional[str] = Field(default=None)


class UserKeyOpParams(ParamsModel):
    uid: str
    key_type: Optional[str] = Field(default="s3")
    access_key: Optional[str] = Field(default=None)
    secret_key: Optional[str] = Field(default=None)
    generate_key: Optional[bool] = Field(default=None)


class UserQuotaOpParams(ParamsModel):
    max_objects: Optional[int] = Field(default=None)
    max_size: Optional[int] = Field(default=None)
    quota_type: Literal["user"] | Literal["bucket"]
    enabled: bool


def params_model_to_params(model: ParamsModel) -> Dict[str, Any]:
    """
    Translates a `ParamsModel` class to a dictionary we can consume as
    parameters for an admin ops api request.
    """
    return {k: v for k, v in model.dict(by_alias=True).items() if v is not None}


class Bucket(BaseModel):
    id: str
    bucket: str
    owner: str
    marker: str
    index_type: str
    ver: str
    master_ver: str
    mtime: dt
    creation_time: dt
    max_marker: str
    usage: Any
    bucket_quota: QuotaInfo

    # optional fields
    tags: Optional[List[TagTypeDef]] = None
    versioning_enabled: bool = Field(default=False)
    object_lock_enabled: bool = Field(default=False)
    retention_enabled: bool = Field(default=False)
    retention_mode: Optional[ObjectLockRetentionModeType] = None
    retention_validity: Optional[int] = None
    retention_unit: Optional[Literal["Days"] | Literal["Years"]] = None


class UsageStats(BaseModel):
    Entries: List[Any]
    Summary: List[int]
    CapacityUsed: List[Any]
