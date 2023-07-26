#!/bin/bash

venvdir="$(realpath .pre-commit-venv)"
if [[ ! -d "${venvdir}" ]]; then
  python3 -m venv ${venvdir} || exit 1
  ${venvdir}/bin/pip install \
    -r src/requirements.txt -r src/requirements-dev.txt || exit 1
fi
source ${venvdir}/bin/activate || exit 1
${venvdir}/bin/pyright \
  --pythonversion 3.10 \
  --pythonplatform Linux \
  src/s3gw_ui_backend.py src/backend/ || exit 1
