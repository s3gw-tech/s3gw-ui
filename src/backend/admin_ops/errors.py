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
import pydash
from fastapi import HTTPException


def error_from_response(res: httpx.Response) -> HTTPException:
    """Translates an error response from the admin ops API to an exception."""
    assert not res.is_success

    error: Dict[str, Any] = {}
    try:
        error = res.json()
    except JSONDecodeError:
        pass

    return HTTPException(
        status_code=res.status_code,
        detail=pydash.human_case(error.get("Code", "UnknownError")),
    )


class MissingParameterError(Exception):
    _param: str

    def __init__(self, param: str) -> None:
        self._param = param

    def __str__(self) -> str:
        return f"Missing parameter: {self._param}"
