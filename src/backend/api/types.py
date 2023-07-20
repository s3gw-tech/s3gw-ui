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
from typing import List, Literal, Optional

from pydantic import BaseModel
from types_aiobotocore_s3.literals import ObjectLockRetentionModeType


class Bucket(BaseModel):
    Name: str
    CreationDate: dt


class Tag(BaseModel):
    Key: str
    Value: str


class BucketObjectLock(BaseModel):
    ObjectLockEnabled: Optional[bool]
    RetentionEnabled: Optional[bool]
    RetentionMode: Optional[ObjectLockRetentionModeType] = None
    RetentionValidity: Optional[int]
    RetentionUnit: Optional[Literal["Days", "Years"]]


class BucketAttributes(Bucket, BucketObjectLock):
    TagSet: List[Tag]
    VersioningEnabled: Optional[bool]
