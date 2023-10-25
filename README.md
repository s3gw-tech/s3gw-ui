# s3gw-ui

[![codecov](https://codecov.io/gh/aquarist-labs/s3gw-ui/branch/main/graph/badge.svg?token=NGRK33SXRB)](https://codecov.io/gh/aquarist-labs/s3gw-ui)

The `s3gw-ui` project is the official user interface for the `s3gw` project.

It is a combination of two distinct components:

- the frontend, which can be found under `src/frontend/`
- the backend, which can be found under `src/backend/` and
  `src/s3gw_ui_backend.py`

Both the frontend and the backend have their specific `README.md` files, which
should be consulted for further information.

## Quick build and run reference

### Requirements

- Python 3, pip, black, tox
- npm
- Docker, Docker compose
- Helm
- k3d

### Setup the running environment for the UI-Backend

```shell
make setup-ui-backend
```

### Build the UI-Frontend

```shell
make build-ui-frontend
```

### Run the UI-Backend

```shell
make run-ui-backend
```

### Build the UI Docker Image

```shell
make image-build-ui
```

For more information on the other tasks in the Makefile
consult both the frontend and the backend `README.md` files.
