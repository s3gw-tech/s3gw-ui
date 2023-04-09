# s3gw-ui backend

These are notes for developers. Users should rely on [s3gw documentation][1].

[1]: https://s3gw-docs.readthedocs.io/en/latest/?badge=latest

## Setup

```shell
$ cd src/
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt -r requirements-dev.txt
```

## Running

### Preparing the UI

Before running the backend, the frontend needs to be built. Otherwise, an error
will be thrown. It is recommended to follow the instructions for the frontend,
but a quick gist of the process is as follows:

```shell
$ cd src/frontend/
$ npm ci
$ npx ng build
```

In reality, the backend only requires the `dist/s3gw-ui/` directory to exist.
For the lazy, creating said directory should be enough.

### Running the backend

Running the backend solely requires running the `s3gw_ui_backend.py` script.

```shell
$ cd src/

$ python3 ./s3gw_ui_backend.py

# or

$ S3GW_DEBUG=1 python3 ./s3gw_ui_backend.py
```

To run with debug mode enabled, specify `S3GW_DEBUG=1`. Note that this will
result in a lot more information than just the backend's debug information. It
may include backtraces from exceptions thrown by used libraries (such as
`aiohttp`) which are harmless, assuming they are caught and handled by the
calling code.

## Testing

We rely on `tox` to orchestrate and manage our tests. There are three different
checks: `py310`, for `pytest` tests; `lint`, for code formatting checks using
`black`; and `types`, for static type checking using `pyright`.

`tox` needs to be run from the `src/` directory, where `tox.ini` is present.

```shell
$ cd src/
$ tox
```

Individual `tox` environments can also be run.

```shell
$ tox -e py310 # for pytest only, for instance
$ tox -e types # for type checking only
$ tox -e lint  # for linting with black and isort
```

To run a single `pytest` test file, one should rely on `tox` instead of `pytest`
directly, as `tox` sets up its own testing environment.

```shell
$ tox -e py310 -- backend/tests/api/test_api.py

# or, for only a testing function within a single test file,

$ tox -e py310 -- backend/tests/api/test_api.py::test_s3server
```

## Developing

We rely on Python 3.10.

### Coding Style

Code is formatted by `black`, with the exception of lines being 80 characters in
length.

Additionally, imports must be sorted according to `isort`'s format, with a
maximum length of 80 characters.

Individual settings for both can be found in `pyproject.toml`.

### Type Checking

We rely on [`pyright`][2] for static type checking. Using type hints is not only
encouraged, it is mandatory, except when the type is rather obvious and in
exceptional circumstances. For more information on type hints, please refer to
the [Python documentation][3].

`pyright` is run in `strict` type checking mode. This means with all
type-checking diagnostic rules enabled. We know this may sometimes be painful,
but it is worth it in the long term. If needed, and solely when the benefit
outweighs the drawbacks, rules can be disabled on a per-file or per-line basis; e.g.,

```python
# pyright: reportMissingTypeStubs=false

import something.without.stubs

...

problematic_line_1()  # pyright: ignore
problematic_line_2()  # pyright: ignore [reportGeneralTypeIssues]

...
```

`pyright`'s documentation includes further information on
[diagnostic suppression][4] and on [diagnostic rules][5].

[2]: https://github.com/microsoft/pyright
[3]: https://docs.python.org/3.10/library/typing.html
[4]: https://microsoft.github.io/pyright/#/comments?id=comments
[5]: https://microsoft.github.io/pyright/#/configuration?id=diagnostic-rule-defaults

### Monitoring coverage

When `pytests` is run (e.g., via `tox -e py310`), a code coverage report is
generated for all python files, excluding tests and type stubs. This report will
be shown to the terminal, written in `coverage.xml`, and also written to
`htmlcov/` as an `html` report.

The latter is more informative than the terminal and the `xml` versions, because
it will allow to check, per-file, the lines that are being covered.

A simple way to properly view this report is by serving this directory via
`nginx`; e.g.,

```
podman run -d --replace --name s3gw-ui-backend-cov \
  -p 31337:80 \
  -v /home/joao/code/aquarist-labs/s3gw-ui.git/src/htmlcov:/usr/share/nginx/html \
  docker.io/library/nginx:latest || exit 1
```

Accessing the host at port `31337` will now provide the coverage report. Should
the server be inaccessible, and a firewall be in place, the port may need to be opened.

### vscode

vscode users may want to configure their workspace to perform most, if not all,
of these actions automatically.

We recommend using the official Python extension, with Pylance as the language
server, and then setting the following as the workspace configuration:

```json
{
  "editor.formatOnSave": true,
  "python.formatting.provider": "black",
  "python.formatting.blackArgs": ["--line-length", "80"],
  "isort.check": true,
  "isort.args": ["--profile", "black"],
  "[python]": {
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  "python.analysis.typeCheckingMode": "strict"
}
```

## Contributing

All submitted patches need to be GPG signed, carry a Developer's Certificate of
Origin, and be accompanied by unit tests.

It is expected that code coverage either remain the same or be improved with
every new patch.

## LICENSE

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

Copywrite is owned by the individual contributors, except when mentioned
otherwise.
