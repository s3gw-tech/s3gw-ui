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

import uuid
from datetime import datetime

from backend.api.types import Bucket, BucketAttributes, BucketObjectLock, Tag


def test_Bucket_type() -> None:
    b_name_a = str(uuid.uuid4())
    b1 = Bucket(Name=b_name_a)
    b2 = Bucket(Name=b_name_a)

    assert b1 == b2

    b_name_b = str(uuid.uuid4())
    dt = datetime.now()
    b1 = Bucket(Name=b_name_b, CreationDate=dt)
    b2 = Bucket(Name=b_name_b, CreationDate=dt)

    assert b1 == b2

    b_name_c = str(uuid.uuid4())
    b1 = Bucket(Name=b_name_c, CreationDate=dt)
    b2 = Bucket(Name=b_name_c)

    assert b1 == b2

    b_name_d = str(uuid.uuid4())
    b1 = Bucket(Name=b_name_d)
    b2 = Bucket(Name=b_name_d, CreationDate=dt)

    assert b1 == b2


def test_Tag_type() -> None:
    t_key_a = str(uuid.uuid4())
    t_val_a = str(uuid.uuid4())
    t1 = Tag(Key=t_key_a, Value=t_val_a)
    t2 = Tag(Key=t_key_a, Value=t_val_a)

    assert t1.__hash__() == t2.__hash__()
    assert t1 == t2


def test_BucketObjectLock_type() -> None:
    bol1 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=13,
        RetentionUnit="Days",
    )
    bol2 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="COMPLIANCE",
        RetentionValidity=13,
        RetentionUnit="Days",
    )
    bol3 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=14,
        RetentionUnit="Years",
    )
    assert bol1 == bol2
    assert bol1 != bol3


def test_BucketAttributes_type() -> None:
    b_name_a = str(uuid.uuid4())
    tag_set_a = [
        Tag(Key=str(uuid.uuid4()), Value=str(uuid.uuid4())),
        Tag(Key=str(uuid.uuid4()), Value=str(uuid.uuid4())),
    ]

    # __eq__ as BucketAttributes

    battrs1 = BucketAttributes(
        Name=b_name_a,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=23,
        RetentionUnit="Days",
        VersioningEnabled=False,
        TagSet=tag_set_a,
    )
    battrs2 = BucketAttributes(
        Name=b_name_a,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=23,
        RetentionUnit="Days",
        VersioningEnabled=False,
        TagSet=tag_set_a,
    )
    assert battrs1 == battrs2

    tag_set_b = [
        Tag(Key=str(uuid.uuid4()), Value=str(uuid.uuid4())),
        Tag(Key=str(uuid.uuid4()), Value=str(uuid.uuid4())),
    ]

    battrs3 = BucketAttributes(
        Name=b_name_a,
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=23,
        RetentionUnit="Days",
        VersioningEnabled=False,
        TagSet=tag_set_b,
    )
    assert battrs1 != battrs3

    # __eq__ between BucketObjectLock/BucketAttribute

    bol1 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=True,
        RetentionMode="GOVERNANCE",
        RetentionValidity=23,
        RetentionUnit="Days",
    )
    assert battrs1 == bol1
    assert bol1 == battrs1

    bol1 = BucketObjectLock(
        ObjectLockEnabled=True,
        RetentionEnabled=False,
        RetentionMode="GOVERNANCE",
        RetentionValidity=23,
        RetentionUnit="Days",
    )
    assert battrs1 != bol1
    assert bol1 != battrs1

    # __eq__ between Bucket/BucketAttribute

    b1 = Bucket(Name=b_name_a)
    assert battrs1 == b1
    assert b1 == battrs1

    b_name_b = str(uuid.uuid4())

    b2 = Bucket(Name=b_name_b)
    assert battrs1 != b2
    assert b2 != battrs1
