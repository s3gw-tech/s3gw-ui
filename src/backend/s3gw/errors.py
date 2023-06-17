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

from botocore.exceptions import ClientError
from fastapi import status


class S3GWError(Exception):
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

    def __str__(self) -> str:
        return f"Error ({self.code}): {self.msg}"


class UserAlreadyExistsError(S3GWError):
    def __init__(self, code: int) -> None:
        super().__init__(code, msg="User Already Exists")


class UserDoesNotExistError(S3GWError):
    def __init__(self, code: int) -> None:
        super().__init__(code, msg="User Does Not Exist")


class AccessKeyDoesNotExistError(S3GWError):
    def __init__(self, code: int) -> None:
        super().__init__(code, msg="Access Key ID Does Not Exist")


class EndpointNotFoundError(S3GWError):
    def __init__(self) -> None:
        super().__init__(status.HTTP_502_BAD_GATEWAY, msg="Endpoint not found")


class SSLNotSupported(S3GWError):
    def __init__(self) -> None:
        super().__init__(
            status.HTTP_501_NOT_IMPLEMENTED, msg="SSL not supported"
        )


def error_from_code(code_str: str, code: int | None = None) -> S3GWError:
    match code_str:
        case "UserAlreadyExists":
            code = code if code is not None else status.HTTP_409_CONFLICT
            return UserAlreadyExistsError(code=code)
        case "NoSuchUser":
            code = code if code is not None else status.HTTP_404_NOT_FOUND
            return UserDoesNotExistError(code=code)
        case "InvalidAccessKeyId":
            code = code if code is not None else status.HTTP_401_UNAUTHORIZED
            return AccessKeyDoesNotExistError(code=code)
        case _:
            code = (
                code
                if code is not None
                else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            return S3GWError(code=code, msg=f"Unknown Error '{code_str}'")


def decode_client_error(e: ClientError) -> S3GWError:
    """
    Returns a tuple of `(status_code, error_message)` according to the
    `botocore's ClientError` exception thas is passed as an argument.
    """
    code_str = "Unknown"

    if "Error" in e.response:
        if "Code" in e.response["Error"]:
            code_str = e.response["Error"]["Code"]

    return error_from_code(code_str)
