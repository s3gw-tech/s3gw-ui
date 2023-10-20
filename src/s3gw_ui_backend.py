#!/usr/bin/env python3

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
import sys
from typing import Any, Awaitable, Callable, List

import uvicorn
from fastapi import FastAPI, Response
from fastapi.logger import logger
from fastapi.staticfiles import StaticFiles
from starlette.types import Scope

from backend.api import admin, auth, buckets, config, objects
from backend.config import Config
from backend.logging import setup_logging


class NoCacheStaticFiles(StaticFiles):
    """
    Add HTTP headers to do not cache the specified files.
    """

    def __init__(self, no_cache_files: List[str], *args: Any, **kwargs: Any):
        """
        :param no_cache_files: The list of files that should not be cached.
        """
        self.no_cache_files = no_cache_files
        super().__init__(*args, **kwargs)

    async def get_response(self, path: str, scope: Scope) -> Response:
        resp = await super().get_response(path, scope)
        if scope["path"] in self.no_cache_files:
            resp.headers.update(
                {
                    "Cache-Control": "no-cache, max-age=0, must-revalidate",
                    "Expires": "0",
                    "Pragma": "no-cache",
                }
            )
        return resp


async def s3gw_startup(s3gw_app: FastAPI, s3gw_api: FastAPI) -> None:
    setup_logging()
    logger.info("Starting s3gw-ui backend")
    try:
        s3gw_api.state.config = Config()
    except Exception:
        logger.error("unable to init config -- exit!")
        sys.exit(1)


async def s3gw_shutdown(s3gw_app: FastAPI, s3gw_api: FastAPI) -> None:
    logger.info("Shutting down s3gw-ui backend")


s3gwAsyncMethod = Callable[[FastAPI, FastAPI], Awaitable[None]]


def s3gw_factory(
    startup: s3gwAsyncMethod = s3gw_startup,
    shutdown: s3gwAsyncMethod = s3gw_shutdown,
    static_dir: str | None = None,
    app_location: str | None = None,
) -> FastAPI:
    api_tags_meta = [
        {
            "name": "bucket",
            "description": "Bucket related operations",
        },
        {
            "name": "admin ops",
            "description": "Admin operations, non-S3 compliant",
        },
        {
            "name": "config",
            "description": "Backend config operations",
        },
    ]

    s3gw_app = FastAPI(docs_url=None)
    s3gw_api = FastAPI(
        title="s3gw-ui API",
        description="<s3gw description>",
        version="1.0.0",
        openapi_tags=api_tags_meta,
    )

    @s3gw_app.on_event("startup")
    async def on_startup():  # type: ignore
        await startup(s3gw_app, s3gw_api)

    @s3gw_app.on_event("shutdown")
    async def on_shutdown():  # type: ignore
        await shutdown(s3gw_app, s3gw_api)

    s3gw_api.include_router(admin.router)
    s3gw_api.include_router(auth.router)
    s3gw_api.include_router(buckets.router)
    s3gw_api.include_router(objects.router)
    s3gw_api.include_router(config.router)

    s3gw_app.mount(
            f"{app_location}/api" if app_location is not None else "/api",
            s3gw_api,
            name="api")

    if static_dir is not None:
        # Disable caching of `index.html` on purpose so that the browser
        # is always loading the latest app code, otherwise changes to the
        # app are not taken into account when the browser is loading the
        # file from the cache.
        s3gw_app.mount(
            app_location if app_location is not None else "/",
            NoCacheStaticFiles(
                no_cache_files=["/"], directory=static_dir, html=True
            ),
            name="static",
        )

    return s3gw_app


def app_factory():
    s3gw_ui_location = os.getenv("S3GW_UI_LOCATION")

    static_dir = os.path.join(
        os.path.dirname(os.path.realpath(__file__)), "frontend/dist/s3gw-ui/"
    )
    return s3gw_factory(s3gw_startup,
                        s3gw_shutdown,
                        static_dir,
                        s3gw_ui_location)


def main():
    # use this for development; production systems should be running with
    # uvicorn directly.
    uvicorn.run(  # type: ignore
        "s3gw_ui_backend:app_factory", host="0.0.0.0", port=8080, factory=True
    )


if __name__ == "__main__":
    main()
