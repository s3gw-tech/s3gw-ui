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
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field
from types_aiobotocore_s3.literals import ObjectLockRetentionModeType
from types_aiobotocore_s3.type_defs import TagTypeDef


class AdminOpsError(Exception):
    _msg: str | None
    _code: int

    def __init__(self, code: int, msg: str | None = None) -> None:
        self._msg = msg
        self._code = code

    @property
    def msg(self) -> str:
        return self._msg if self._msg is not None else ""

    @property
    def code(self) -> int:
        return self._code


class QuotaInfo(BaseModel):
    enabled: bool
    check_on_raw: bool
    max_size: int
    max_size_kb: int
    max_objects: int


class UserKeys(BaseModel):
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
    keys: List[UserKeys]
    caps: List[Any]
    op_mask: str
    system: bool
    admin: bool
    bucket_quota: QuotaInfo
    user_quota: QuotaInfo


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
