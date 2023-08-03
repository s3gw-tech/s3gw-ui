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

from __future__ import annotations

from datetime import datetime as dt
from typing import List, Literal, Optional

from pydantic import BaseModel
from types_aiobotocore_s3.literals import ObjectLockRetentionModeType


class Bucket(BaseModel):
    Name: str
    CreationDate: Optional[dt] = None

    def __eq__(self, other: Bucket) -> bool:
        return (
            self.Name == other.Name and self.CreationDate == other.CreationDate
            if (
                self.CreationDate is not None and other.CreationDate is not None
            )
            else self.Name == other.Name
        )


class Tag(BaseModel):
    Key: str
    Value: str

    def __eq__(self, other: Tag) -> bool:
        return self.Key == other.Key and self.Value == other.Value

    def __hash__(self):
        return hash((self.Key, self.Value))


class BucketObjectLock(BaseModel):
    ObjectLockEnabled: Optional[bool]
    RetentionEnabled: Optional[bool]
    RetentionMode: Optional[ObjectLockRetentionModeType] = None
    RetentionValidity: Optional[int]
    RetentionUnit: Optional[Literal["Days", "Years"]]

    def __eq__(self, other: BucketObjectLock) -> bool:
        return (
            self.ObjectLockEnabled == other.ObjectLockEnabled
            and self.RetentionEnabled == other.RetentionEnabled
            and self.RetentionMode == other.RetentionMode
            and self.RetentionValidity == other.RetentionValidity
            and self.RetentionUnit == other.RetentionUnit
        )


class BucketAttributes(Bucket, BucketObjectLock):
    TagSet: List[Tag]
    VersioningEnabled: Optional[bool]

    def __eq__(self, other: object) -> bool:
        if isinstance(other, BucketAttributes):
            return (
                self.VersioningEnabled == other.VersioningEnabled
                and Bucket.__eq__(self, other)
                and BucketObjectLock.__eq__(self, other)
                and set(self.TagSet) == set(other.TagSet)
            )
        if isinstance(other, BucketObjectLock):
            return BucketObjectLock.__eq__(self, other)
        if isinstance(other, Bucket):
            return Bucket.__eq__(self, other)
        else:
            return NotImplemented


class Object(BaseModel):
    Name: str
    Type: Literal["OBJECT", "FOLDER"]
    Key: str
    LastModified: Optional[dt] = None
    ETag: Optional[str] = None
    Size: Optional[int] = None
