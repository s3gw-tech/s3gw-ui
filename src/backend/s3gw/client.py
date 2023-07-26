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

# pyright: reportUnnecessaryCast=false

import contextlib
from typing import AsyncGenerator, cast

from aiobotocore.session import AioSession
from botocore.config import Config as S3Config
from botocore.exceptions import ClientError, EndpointConnectionError, SSLError
from fastapi import HTTPException
from fastapi.logger import logger
from types_aiobotocore_s3.client import S3Client

from backend.s3gw.errors import (
    EndpointNotFoundError,
    S3GWError,
    SSLNotSupported,
    decode_client_error,
)


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
        async with session.create_client(  # noqa: E501 # pyright: ignore [reportUnknownMemberType]
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
                raise decode_client_error(e)
            except EndpointConnectionError:
                raise EndpointNotFoundError()
            except SSLError:
                raise SSLNotSupported()
            except HTTPException as e:
                # probably an error raised by yielded client context; lets
                # propagate it.
                raise e
            except Exception as e:
                logger.error(f"Unknown error: {e}")
                logger.error(f"  exception: {type(e)}")
                raise S3GWError(code=500, msg=str(e))
