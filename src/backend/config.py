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

import json
import os
import re
from enum import Enum, EnumMeta
from typing import Any, Callable, Dict, Optional, Type, TypeVar

from fastapi.logger import logger


class S3AddressingStyleEnumMeta(EnumMeta):
    def __contains__(self, item: Any):
        return item in self._value2member_map_


class S3AddressingStyle(Enum, metaclass=S3AddressingStyleEnumMeta):
    AUTO = "auto"
    VIRTUAL = "virtual"
    PATH = "path"


class EnvironMalformedError(Exception):
    def __init__(self, key: str) -> None:
        super().__init__(
            f"The value of the environment variable {key} is malformed"
        )


class EnvironMissingError(Exception):
    def __init__(self, key: str) -> None:
        super().__init__(f"The environment variable {key} is not set")


ET = TypeVar("ET", bound=Enum)  # Enum type.


def get_environ_str(
    key: str,
    default: Optional[str] = None,
    cb: Optional[Callable[[str, str | None], str]] = None,
) -> str:
    """
    Helper function to obtain a string value from an environment variable.
    :param key: The name of the environment variable.
    :param default: The default value if the variable does not exist.
        Defaults to an empty string.
    :param cb: An optional callback function that is used to post-process
        the value from the environment variable. The callback function
        must return a string.
    :return: The content of the specified environment variable as string.
        If the environment variable is not set, an empty string is returned.
    """
    value: str | None = os.environ.get(key, default)
    if cb:
        value = cb(key, value)
    else:
        value = "" if value is None else value
    logger.info(f"Using {key}={value}")
    return value


def get_environ_enum(enum_cls: Type[ET], key: str, default: Any) -> ET:
    """
    Helper function to obtain an enum value from an environment variable.
    :param enum_cls: The enum class to be used.
        Note for Python < 3.12: Make sure the `Enum` metaclass overrides
        the __contains__ dunder method to do not throw an exception if
        the checked value does not exist.
    :param key: The name of the environment variable.
    :param default: The default value if the variable does not exist.
        Defaults to an empty string.
    :return: The content of the specified environment variable as enum.
    """
    value: Any = os.environ.get(key, default)
    if value not in enum_cls:
        value = default
    logger.info(f"Using {key}={value}")
    return enum_cls(value)


def get_s3gw_address() -> str:
    """
    Obtain s3gw service address from environment, and validate format.
    """

    def post_process(key: str, value: str | None) -> str:
        if value is None:
            logger.error(f"The environment variable {key} is not set")
            raise EnvironMissingError(key)
        m = re.fullmatch(r"https?://[\w.-]+(?:\.[\w]+)?(?::\d+)?/?", value)
        if m is None:
            logger.error(
                f"Malformed value in environment variable {key}: {value}"
            )
            raise EnvironMalformedError(key)
        return value

    url = get_environ_str("S3GW_SERVICE_URL", cb=post_process)
    return url


def get_ui_path(default: str = "/") -> str:
    """
    Obtain the path under which the UI should be served, e.g. `/ui`.
    """

    def post_process(key: str, value: str | None) -> str:
        if value is None or value == "/":
            return default
        # TODO: The path should be validated here
        match = re.fullmatch(r".*", value)
        if match is None:
            logger.error(
                f"The value of the environment variable {key} is malformed: {value}"  # noqa: E501
            )
            raise EnvironMalformedError(key)
        return f"/{value.strip('/')}"

    return get_environ_str("S3GW_UI_PATH", cb=post_process)


def get_api_path(default: str = "/api") -> str:
    def post_process(_: str, value: str | None) -> str:
        if value is None or value == "":
            value = default
        return f"/{value.strip('/')}"

    return get_environ_str("S3GW_API_PATH", cb=post_process)


class Config:
    """
    Keeps config relevant for the backend's operation.
    """

    # Address for the s3gw instance we're servicing.
    _s3gw_addr: str
    _s3_addressing_style: S3AddressingStyle
    _s3_prefix_delimiter: str
    _ui_path: str
    _api_path: str
    _instance_id: str

    def __init__(self) -> None:
        self._s3gw_addr = get_s3gw_address()
        self._s3_addressing_style = get_environ_enum(
            S3AddressingStyle, "S3GW_S3_ADDRESSING_STYLE", "auto"
        )
        self._s3_prefix_delimiter = get_environ_str(
            "S3GW_S3_PREFIX_DELIMITER", "/"
        )
        self._ui_path = get_ui_path()
        self._api_path = get_api_path()
        self._instance_id = get_environ_str("S3GW_INSTANCE_ID")

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

    @property
    def s3_prefix_delimiter(self) -> str:
        """
        The prefix delimiter. Defaults to `/`. See
        https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-prefixes.html
        """
        return self._s3_prefix_delimiter

    @property
    def instance_id(self) -> str:
        """
        Obtain the instance identifier. Defaults to an empty string.
        """
        return self._instance_id

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ApiPath": self.api_path,
            "Delimiter": self.s3_prefix_delimiter,
            "Endpoint": self.s3gw_addr,
            "InstanceId": self.instance_id,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())
