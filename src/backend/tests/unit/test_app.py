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

from pathlib import Path, PosixPath

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from s3gw_ui_backend import NoCacheStaticFiles, app_factory


@pytest.fixture
def test_data(tmp_path: PosixPath):
    """
    Create the test data and make sure it is removed afterward.
    :param tmp_path: The temporary directory path.
                     See https://docs.pytest.org/en/7.1.x/how-to/tmp_path.html
    :return: Returns the temporary directory path.
    """
    file_names = ["index.html", "test.html"]
    for file_name in file_names:
        Path(tmp_path, file_name).touch()
    yield tmp_path
    for file_name in file_names:
        Path(tmp_path, file_name).unlink()


def test_static_files_1(test_data: PosixPath) -> None:
    app = FastAPI()
    app.mount(
        "/",
        NoCacheStaticFiles(no_cache_files=["/index.html"], directory=test_data),
        name="static",
    )
    client = TestClient(app)
    resp = client.get("/index.html")
    assert resp.status_code == 200
    assert (
        resp.headers["cache-control"] == "no-cache, max-age=0, must-revalidate"
    )
    assert resp.headers["expires"] == "0"
    assert resp.headers["pragma"] == "no-cache"


def test_static_files_2(test_data: PosixPath) -> None:
    app = FastAPI()
    app.mount(
        "/",
        NoCacheStaticFiles(no_cache_files=["/index.html"], directory=test_data),
        name="static",
    )
    client = TestClient(app)
    resp = client.get("/test.html")
    assert resp.status_code == 200
    assert "cache-control" not in resp.headers
    assert "expires" not in resp.headers
    assert "pragma" not in resp.headers


def test_api() -> None:
    app = app_factory()
    client = TestClient(app)

    resp = client.get("/api/buckets/")
    assert resp.status_code == 422
    assert resp.headers["content-type"] == "application/json"
