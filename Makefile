# Copyright © 2023 SUSE LLC
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

.PHONY: check-ui-backend-env
.DEFAULT_GOAL:=image-build-ui

########################################################################
# Testing cluster

cluster-start:
	@./test-env/cluster-create.sh
	k3d kubeconfig merge -ad
	kubectl config use-context k3d-s3gw-ui-testing
	@./test-env/cluster-prepare.sh

cluster-delete:
	k3d cluster delete s3gw-ui-testing
	@if test -f /usr/local/bin/rke2-uninstall.sh; then sudo sh /usr/local/bin/rke2-uninstall.sh; fi

########################################################################
# Setup UI components

setup-ui-backend:
	cd src \
	&& python3 -m venv venv \
	&& source venv/bin/activate \
	&& pip install -r requirements.txt -r requirements-dev.txt

########################################################################
# Build UI components

build-ui-frontend:
	cd src/frontend && npm ci && npx ng build

########################################################################
# Build UI Image

image-build-ui: build-ui-frontend
	docker build -t s3gw-ui:latest -f src/Dockerfile src

########################################################################
# Run UI components

run-ui-backend: check-ui-backend-env setup-ui-backend build-ui-frontend
	cd src \
	&& source venv/bin/activate \
	&& S3GW_DEBUG=1 python3 ./s3gw_ui_backend.py

########################################################################
# Patch UI deployment on cluster

patch-ui-deployment:
	@./test-env/patch-ui-deployment.sh

########################################################################
# Lint UI components

lint-ui-fronted:
	cd src/frontend && npm run lint

lint-ui-backend:
	cd src && tox -e lint

########################################################################
# Format Code

format-ui-backend:
	cd src && isort backend && black backend

########################################################################
# Check UI components

check-ui-backend:
	cd src && tox -e types

########################################################################
# Test UI components

test-ui-fronted:
	cd src/frontend && npm run test:ci

test-ui-backend:
	cd src && tox -e py310

test-ui-backend-with-s3gw:
	@./test-env/run-tests.sh

# Check whether we have a valid S3GW_SERVICE_URL environment variable
#
check-ui-backend-env:
ifndef S3GW_SERVICE_URL
	$(error S3GW_SERVICE_URL must be set.)
endif
