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
import re
from enum import Enum, EnumMeta
from typing import Any

from fastapi.logger import logger


class S3AddressingStyleEnumMeta(EnumMeta):
    def __contains__(self, item: Any):
        return item in self._value2member_map_


class S3AddressingStyle(Enum, metaclass=S3AddressingStyleEnumMeta):
    AUTO = "auto"
    VIRTUAL = "virtual"
    PATH = "path"


def get_s3gw_address() -> str:
    """Obtain s3gw service address from environment, and validate format."""

    url = os.environ.get("S3GW_SERVICE_URL")
    if url is None:
        logger.error("S3GW_SERVICE_URL env variable not set!")
        raise Exception("S3GW_SERVICE_URL env variable not set")
    m = re.fullmatch(r"https?://[\w.-]+(?:\.[\w]+)?(?::\d+)?/?", url)
    if m is None:
        logger.error(f"Malformed s3gw URL: {url}")
        raise Exception("Malformed URL")

    return url


def get_ui_path() -> str:
    """Obtain the path under which the UI should be served, e.g. /ui"""
    path = os.environ.get("S3GW_UI_PATH")
    if path is None:
        return "/"
    match = re.fullmatch(r"/?[\w.-/]+(?:[\w]+)/?", path)
    if match is None:
        logger.error(f"Malformed path for UI: {path}")
        raise Exception("Malformed UI path")
    return path if path.startswith("/") else f"/{path}"


def get_api_path(ui_path: str) -> str:
    """
    Obtain the path under which the API for the UI should be served from the
    path of the UI itself. E.g. when the UI path is `/ui`, this will be
    `/ui/api`
    """
    return f"{ui_path.rstrip('/')}/api"


def get_s3_addressing_style() -> S3AddressingStyle:
    """
    Obtain the S3 addressing style. Defaults to `auto`.
    """
    addressing_style: str = os.environ.get(
        "S3GW_S3_ADDRESSING_STYLE", "auto"
    ).lower()
    if addressing_style not in S3AddressingStyle:
        addressing_style = S3AddressingStyle.AUTO.value
    logger.info(f"Using '{addressing_style}' S3 addressing style")
    return S3AddressingStyle(addressing_style)


class Config:
    """Keeps config relevant for the backend's operation."""

    # Address for the s3gw instance we're servicing.
    _s3gw_addr: str
    _s3_addressing_style: S3AddressingStyle
    _ui_path: str
    _api_path: str

    def __init__(self) -> None:
        self._s3gw_addr = get_s3gw_address()
        self._s3_addressing_style = get_s3_addressing_style()
        self._ui_path = get_ui_path()
        self._api_path = get_api_path(self._ui_path)
        logger.info(f"Servicing s3gw at {self._s3gw_addr}")

    @property
    def s3gw_addr(self) -> str:
        """Obtain the address for the s3gw instance we are servicing."""
        return self._s3gw_addr

    @property
    def ui_path(self) -> str:
        """Obtain UI path"""
        return self._ui_path

    @property
    def api_path(self) -> str:
        """Obtain API path"""
        return self._api_path

    @property
    def s3_addressing_style(self) -> S3AddressingStyle:
        """
        Obtain the S3 addressing style.
        """
        return self._s3_addressing_style
