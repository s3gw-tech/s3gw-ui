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
from typing import Any, Dict

from pytest_mock import MockerFixture

import backend.logging


def test_setup_logging(mocker: MockerFixture) -> None:
    called_basic = False
    called_debug = False
    called_with_file = False

    def mock_setup_logging_basic(lvl: str, logfile: str | None) -> None:
        nonlocal called_basic
        called_basic = True
        assert lvl == "INFO"
        assert logfile is None

    def mock_setup_logging_debug(lvl: str, logfile: str | None) -> None:
        nonlocal called_debug
        called_debug = True
        assert lvl == "DEBUG"
        assert logfile is None

    def mock_setup_logging_with_file(lvl: str, logfile: str | None) -> None:
        nonlocal called_with_file
        called_with_file = True
        assert lvl == "INFO"
        assert logfile is not None
        assert logfile == "foo"

    mocker.patch("backend.logging._setup_logging", new=mock_setup_logging_basic)
    backend.logging.setup_logging()
    assert called_basic

    mocker.patch("backend.logging._setup_logging", new=mock_setup_logging_debug)
    bak_environ = os.environ.copy()
    os.environ["S3GW_DEBUG"] = "1"
    backend.logging.setup_logging()
    assert called_debug

    mocker.patch(
        "backend.logging._setup_logging", new=mock_setup_logging_with_file
    )
    os.environ = bak_environ
    os.environ["S3GW_LOG_FILE"] = "foo"
    backend.logging.setup_logging()
    assert called_with_file


def clean_env() -> None:
    if "S3GW_LOG_FILE" in os.environ:
        del os.environ["S3GW_LOG_FILE"]
    if "S3GW_DEBUG" in os.environ:
        del os.environ["S3GW_DEBUG"]


def test_set_logging_config(mocker: MockerFixture) -> None:
    called_set_default_cfg = False
    called_set_debug_cfg = False
    called_set_file_cfg = False

    def mock_set_default_config(cfg: Dict[str, Any]) -> None:
        nonlocal called_set_default_cfg
        called_set_default_cfg = True
        assert "handlers" in cfg
        assert "log_file" not in cfg["handlers"]
        assert "root" in cfg
        assert "handlers" in cfg["root"]
        assert "log_file" not in cfg["root"]["handlers"]
        assert cfg["handlers"]["console"]["level"] == "INFO"

    def mock_set_debug_config(cfg: Dict[str, Any]) -> None:
        nonlocal called_set_debug_cfg
        called_set_debug_cfg = True
        assert cfg["handlers"]["console"]["level"] == "DEBUG"

    def mock_set_file_config(cfg: Dict[str, Any]) -> None:
        nonlocal called_set_file_cfg
        called_set_file_cfg = True
        assert "log_file" in cfg["handlers"]
        assert cfg["handlers"]["log_file"]["filename"] == "foo"
        assert "log_file" in cfg["root"]["handlers"]

    mocker.patch("logging.config.dictConfig", new=mock_set_default_config)
    clean_env()
    backend.logging.setup_logging()
    assert called_set_default_cfg

    mocker.patch("logging.config.dictConfig", new=mock_set_debug_config)
    clean_env()
    os.environ["S3GW_DEBUG"] = "1"
    backend.logging.setup_logging()
    assert called_set_debug_cfg

    mocker.patch("logging.config.dictConfig", new=mock_set_file_config)
    clean_env()
    os.environ["S3GW_LOG_FILE"] = "foo"
    backend.logging.setup_logging()
    assert called_set_file_cfg


def test_get_uvicorn_logging_config_1() -> None:
    os.environ["S3GW_DEBUG"] = "yes"
    config: Dict[str, Any] = backend.logging.get_uvicorn_logging_config()
    clean_env()
    assert "DEBUG" == config["handlers"]["default"]["level"]


def test_get_uvicorn_logging_config_2() -> None:
    os.environ.pop("S3GW_DEBUG", None)
    config: Dict[str, Any] = backend.logging.get_uvicorn_logging_config()
    assert "INFO" == config["handlers"]["default"]["level"]
