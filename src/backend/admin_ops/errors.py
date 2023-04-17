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

from json import JSONDecodeError
from typing import Any, Dict

import httpx


class AdminOpsError(Exception):
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


class UserAlreadyExistsError(AdminOpsError):
    def __init__(self, code: int) -> None:
        super().__init__(code, msg="User Already Exists")


class UserDoesNotExistError(AdminOpsError):
    def __init__(self, code: int) -> None:
        super().__init__(code, msg="User Does Not Exist")


class AccessKeyDoesNotExistError(AdminOpsError):
    def __init__(self, code: int) -> None:
        super().__init__(code, msg="Access Key ID Does Not Exist")


def error_from_response(res: httpx.Response) -> AdminOpsError:
    """Translates an error response from the admin ops API to an exception."""
    assert not res.is_success

    error: Dict[str, Any] | None = None
    try:
        error = res.json()
    except JSONDecodeError:
        pass

    if error is None or "Code" not in error:
        return AdminOpsError(res.status_code)

    code: str = error["Code"]

    match code:
        case "UserAlreadyExists":
            return UserAlreadyExistsError(res.status_code)
        case "NoSuchUser":
            return UserDoesNotExistError(res.status_code)
        case "InvalidAccessKeyId":
            return AccessKeyDoesNotExistError(res.status_code)
        case _:
            return AdminOpsError(res.status_code, msg=code)


class MissingParameterError(Exception):
    _param: str

    def __init__(self, param: str) -> None:
        self._param = param

    def __str__(self) -> str:
        return f"Missing parameter: {self._param}"
