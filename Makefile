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

build-ui-fronted:
	cd src/frontend && npm ci && npx ng build

########################################################################
# Build UI Image

#Kept for convenience until the new backend architecture is not ready.
#This will be likely removed in the future.
image-build-ui-fronted:
	docker build -t s3gw-frontend:latest -f src/frontend/Dockerfile src/frontend

image-build-ui:
	docker build -t s3gw-ui:latest -f src/Dockerfile src

########################################################################
# Run UI components

run-ui-backend:
	cd src \
	&& python3 -m venv venv \
	&& source venv/bin/activate \
	&& S3GW_DEBUG=1 python3 ./s3gw_ui_backend.py

########################################################################
# Lint UI components

lint-ui-fronted:
	cd src/frontend && npm run lint

lint-ui-backend:
	cd src && tox -e lint

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
