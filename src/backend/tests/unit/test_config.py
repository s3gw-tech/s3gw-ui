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

import pytest
from fastapi import FastAPI, Request
from starlette.datastructures import State

from backend.api import s3gw_config
from backend.config import (
    Config,
    get_s3_addressing_style,
    get_s3gw_address,
    get_ui_path,
)


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
        with pytest.raises(Exception) as e:
            get_s3gw_address()
        assert str(e.value) == "Malformed URL"


def test_s3gw_good_address() -> None:
    addr = "http://foo.bar:123"
    os.environ["S3GW_SERVICE_URL"] = addr
    try:
        ret = get_s3gw_address()
        assert ret == addr
    except Exception as e:
        pytest.fail(str(e))


def test_s3gw_missing_address() -> None:
    os.environ.pop("S3GW_SERVICE_URL")
    with pytest.raises(Exception) as e:
        get_s3gw_address()
    assert str(e.value) == "S3GW_SERVICE_URL env variable not set"


def test_config_1() -> None:
    addr = "something:foo.bar:123"
    os.environ["S3GW_SERVICE_URL"] = addr
    with pytest.raises(Exception):
        Config()


def test_config_2() -> None:
    addr = "http://foo.bar:123"
    os.environ["S3GW_SERVICE_URL"] = addr
    try:
        cfg = Config()
        assert cfg.s3gw_addr == addr
    except Exception as e:
        pytest.fail(str(e))


def test_s3gw_endpoint() -> None:
    addr = "http://foo.baz:7480"
    os.environ["S3GW_SERVICE_URL"] = addr
    app = FastAPI()
    app.state = State({"config": Config()})
    req = Request({"type": "http", "app": app})
    config: Config = s3gw_config(req)
    assert config.s3gw_addr == addr


def test_malformed_ui_path() -> None:
    bad_paths = [
        "",
        "foo:bar",
    ]
    for loc in bad_paths:
        os.environ["S3GW_UI_PATH"] = loc
        with pytest.raises(Exception) as e:
            get_ui_path()
        assert str(e.value) == "Malformed UI path"


def test_good_ui_path() -> None:
    path = "/s3store"
    os.environ["S3GW_UI_PATH"] = path
    try:
        cfg = Config()
        assert cfg.ui_path == path
    except Exception as e:
        pytest.fail(str(e))


def test_no_ui_path() -> None:
    os.environ.pop("S3GW_UI_PATH")
    try:
        cfg = Config()
        assert cfg.ui_path == "/"
    except Exception as e:
        pytest.fail(str(e))


def test_good_ui_api_path() -> None:
    path = "/s3store"
    os.environ["S3GW_UI_PATH"] = path
    try:
        cfg = Config()
        assert cfg.api_path == "/s3store/api"
    except Exception as e:
        pytest.fail(str(e))


def test_api_path_with_trailing_slash() -> None:
    path = "/s3store/"
    os.environ["S3GW_UI_PATH"] = path
    try:
        cfg = Config()
        assert cfg.api_path == "/s3store/api"
    except Exception as e:
        pytest.fail(str(e))


def test_get_s3_addressing_style_1() -> None:
    os.environ["S3GW_S3_ADDRESSING_STYLE"] = "foo"
    assert "auto" == get_s3_addressing_style()


def test_get_s3_addressing_style_2() -> None:
    os.environ["S3GW_S3_ADDRESSING_STYLE"] = "VIRTUAL"
    assert "virtual" == get_s3_addressing_style()


def test_get_s3_addressing_style_3() -> None:
    os.environ.pop("S3GW_S3_ADDRESSING_STYLE", None)
    assert "auto" == get_s3_addressing_style()
