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

from backend.admin_ops.types import UserKeyOpParams, params_model_to_params


def test_params_model_to_params() -> None:
    res = params_model_to_params(
        UserKeyOpParams(
            uid="foo",
            key_type="s3",
            access_key="bar",
            secret_key="baz",
            generate_key=True,
        )
    )
    assert "uid" in res
    assert "key-type" in res and res["key-type"] == "s3"
    assert "access-key" in res and res["access-key"] == "bar"
    assert "secret-key" in res and res["secret-key"] == "baz"
    assert "generate-key" in res and res["generate-key"] is True
