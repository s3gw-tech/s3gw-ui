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

import httpx

from backend.admin_ops.errors import error_from_response
from backend.s3gw.errors import (
    AccessKeyDoesNotExistError,
    S3GWError,
    UserAlreadyExistsError,
    UserDoesNotExistError,
)


def test_errors_from_response() -> None:
    errors = {
        "UserAlreadyExists": UserAlreadyExistsError,
        "NoSuchUser": UserDoesNotExistError,
        "InvalidAccessKeyId": AccessKeyDoesNotExistError,
    }

    for err, exc in errors.items():
        raised = False
        res = httpx.Response(status_code=500, json={"Code": err})
        try:
            raise error_from_response(res)
        except exc as e:
            raised = True
            assert type(e) != S3GWError
        except Exception:
            print(f"Failed handling error '{err}'")
            assert False
        assert raised

    raised = False
    res = httpx.Response(status_code=500)
    try:
        raise error_from_response(res)
    except S3GWError as e:
        raised = True
        assert type(e) == S3GWError
    except Exception:
        assert False
    assert raised

    raised = False
    res = httpx.Response(status_code=500, json={"Code": "Whatever"})
    try:
        raise error_from_response(res)
    except S3GWError as e:
        raised = True
        assert type(e) == S3GWError
    except Exception:
        assert False
    assert raised
