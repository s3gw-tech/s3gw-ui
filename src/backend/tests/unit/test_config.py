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

import os

from backend.config import Config, get_s3gw_address


def test_s3gw_malformed_address() -> None:
    bad_urls = [
        "something://foo.bar:123",
        "http:/foo.bar:123",
        "http//foo.bar:123",
        "httpp://foo.bar:123",
        "https://foo+bar:123",
        "https://foo.bar:123a",
    ]

    for url in bad_urls:
        os.environ["S3GW_SERVICE_URL"] = url

        error_found = False
        try:
            get_s3gw_address()
        except Exception:
            error_found = True

        assert error_found


def test_s3gw_good_address() -> None:
    addr = "http://foo.bar:123"

    error_found = False
    os.environ["S3GW_SERVICE_URL"] = addr
    try:
        ret = get_s3gw_address()
        assert ret == addr
    except Exception:
        error_found = True

    assert not error_found


def test_config() -> None:
    bad_addr = "something:foo.bar:123"
    os.environ["S3GW_SERVICE_URL"] = bad_addr
    error_found = False
    try:
        Config()
    except Exception:
        error_found = True

    assert error_found

    good_addr = "http://foo.bar:123"
    os.environ["S3GW_SERVICE_URL"] = good_addr
    try:
        cfg = Config()
        assert cfg.s3gw_addr == good_addr
    except Exception:
        assert False
