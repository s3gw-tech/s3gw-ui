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

import contextlib
import re
from typing import Annotated, Any, AsyncGenerator, Dict, Tuple, cast

from aiobotocore.session import AioSession
from botocore.config import Config as S3Config
from botocore.exceptions import ClientError, EndpointConnectionError, SSLError
from fastapi import Header, HTTPException, status
from fastapi.logger import logger
from types_aiobotocore_s3.client import S3Client


class S3GWClient:
    """
    Represents a client connection to an s3gw server.

    A connection is not opened by this class. Instead, a client is created when
    requesting a connection via the `conn()` context manager, and the connection
    is handled by the `aiobotocore's S3Client` class that is returned.
    """

    _endpoint: str
    _access_key: str
    _secret_key: str

    def __init__(self, endpoint: str, access_key: str, secret_key: str) -> None:
        """
        Creates a new `S3GWClient` instance.

        Arguments:
        * `endpoint`: the URL where the server is expected to be at.
        * `access_key`: the user's `access key`.
        * `secret_key`: the user's `secret access key`.
        """
        self._endpoint = endpoint
        self._access_key = access_key
        self._secret_key = secret_key

    @contextlib.asynccontextmanager
    async def conn(self, attempts: int = 1) -> AsyncGenerator[S3Client, None]:
        """
        Yields an `aiobotocore's S3Client` instance, that can be used to
        perform operations against an S3-compatible server. In case of failure,
        by default, the operation only performs one attempt.

        This context manager will catch most exceptions thrown by the
        `S3Client`'s operations, and convert them to `fastapi.HTTPException`.
        """
        session = AioSession()
        async with session.create_client(
            "s3",
            endpoint_url=self._endpoint,
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            config=S3Config(
                retries={
                    "max_attempts": attempts,
                    "mode": "standard",
                }
            ),
        ) as client:
            try:
                yield cast(S3Client, client)
            except ClientError as e:
                (code, msg) = decode_client_error(e)
                raise HTTPException(status_code=code, detail=msg)
            except EndpointConnectionError as e:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Endpoint not found",
                )
            except SSLError as e:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="SSL not supported",
                )
            except Exception as e:
                logger.error(f"Unknown error: {e}")
                logger.error(f"  exception: {type(e)}")
                raise HTTPException(status_code=500)


def decode_client_error(e: ClientError) -> Tuple[int, str]:
    """
    Returns a tuple of `(status_code, error_message)` according to the
    `botocore's ClientError` exception thas is passed as an argument.
    """
    status_code = 500
    msg = "Unknown Error"

    if "Error" in e.response:
        if "Code" in e.response["Error"]:
            if e.response["Error"]["Code"] == "InvalidAccessKeyId":
                msg = "Invalid credentials"
                status_code = status.HTTP_401_UNAUTHORIZED

    return (status_code, msg)


async def s3gw_client(
    x_s3gw_endpoint: Annotated[str, Header()],
    x_s3gw_credentials: Annotated[str, Header()],
) -> S3GWClient:
    """
    To be used for FastAPI's dependency injection, reads the request's HTTP
    headers for s3gw's endpoint and user credentials, returning an `S3GWClient`
    class instance.
    """
    m = re.fullmatch(
        r"https?://[\w.-]+(?:\.[\w]+)?(?::\d+)?/?", x_s3gw_endpoint
    )
    if m is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed S3 endpoint URL",
        )

    # credentials follow the format 'access_key:secret_key'
    m = re.fullmatch(r"^([\w+/=]+):([\w+/=]+)$", x_s3gw_credentials)
    if m is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing of malformed credentials",
        )

    assert len(m.groups()) == 2
    access, secret = m.group(1), m.group(2)
    assert len(access) > 0 and len(secret) > 0
    return S3GWClient(x_s3gw_endpoint, access, secret)


def s3gw_client_responses() -> Dict[int | str, Dict[str, Any]]:
    """
    Used to populate FastAPI's OpenAPI's method documentation, returns a
    dictionary containing the several error responses raised by `s3gw_client()`.
    """
    return {
        status.HTTP_401_UNAUTHORIZED: {
            "description": "Invalid credentials",
        },
        status.HTTP_502_BAD_GATEWAY: {
            "description": "Endpoint not found",
        },
        status.HTTP_501_NOT_IMPLEMENTED: {
            "description": "SSL not supported",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "description": "Unexpected error",
        },
    }
