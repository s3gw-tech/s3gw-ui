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

from fastapi.logger import logger


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


def get_ui_location() -> str:
    """Obtain the location path under which the UI should be served, e.g. /ui"""
    loc = os.environ.get("S3GW_UI_LOCATION")
    if loc is None:
        return "/"
    m = re.fullmatch(r"/?[\w.-/]+(?:[\w]+)/?", loc)
    if m is None:
        logger.error(f"Malformed path for UI location: {loc}")
        raise Exception("Malformed UI location")
    return loc if loc.startswith("/") else f"/{loc}"


def get_api_location(ui_location: str) -> str:
    return f"{ui_location.rstrip('/')}/api"


class Config:
    """Keeps config relevant for the backend's operation."""

    # Address for the s3gw instance we're servicing.
    _s3gw_addr: str

    _ui_location: str
    _api_location: str

    def __init__(self) -> None:
        self._s3gw_addr = get_s3gw_address()
        self._ui_location = get_ui_location()
        self._api_location = get_api_location(self._ui_location)
        logger.info(f"Servicing s3gw at {self._s3gw_addr}")

    @property
    def s3gw_addr(self) -> str:
        """Obtain the address for the s3gw instance we are servicing."""
        return self._s3gw_addr

    @property
    def ui_location(self) -> str:
        """Obtain UI location path"""
        return self._ui_location

    @property
    def api_location(self) -> str:
        """Obtain API location path"""
        return self._api_location
