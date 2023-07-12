#!/bin/bash
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

set -e

UI_IMAGE_TAG=${UI_IMAGE_TAG:-"$(git describe --tags --always)"}
BE_IMAGE_TAG=${BE_IMAGE_TAG:-"latest"}
imageS3GWUI="quay.io/s3gw/s3gw-ui"
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

function prepare_system_domain {
  echo -e "\e[32mGenerating a magic domain...\e[0m"
  S3GW_CLUSTER_IP=$(docker inspect k3d-s3gw-ui-testing-server-0 | jq -r '.[0]["NetworkSettings"]["Networks"]["s3gw-ui-testing"]["IPAddress"]')
  if [[ -z $S3GW_CLUSTER_IP ]]; then
    echo "Couldn't find the cluster's IP address"
    exit 1
  fi
  export S3GW_CLUSTER_IP="${S3GW_CLUSTER_IP}"
  export S3GW_SYSTEM_DOMAIN="${S3GW_CLUSTER_IP}.omg.howdoi.website"
  echo -e "Using \e[32m${S3GW_SYSTEM_DOMAIN}\e[0m for s3gw domain"
}

function deploy_s3gw_latest_released {
  helm upgrade --debug --wait --install -n s3gw-ui-testing --create-namespace s3gw-ui-testing s3gw/s3gw \
    --set publicDomain="${S3GW_SYSTEM_DOMAIN}" \
    --set ui.publicDomain="${S3GW_SYSTEM_DOMAIN}" \
    --set ui.imageTag="${UI_IMAGE_TAG}" \
    --set imageTag="${BE_IMAGE_TAG}" \
    --set logLevel="20"
}

echo "Preparing k3d environment"

helm repo add jetstack https://charts.jetstack.io
helm repo add s3gw https://aquarist-labs.github.io/s3gw-charts/
helm repo update

#Install the cert-manager
if ! [[ -v SKIP_CM_INSTALL ]]; then
kubectl create namespace cert-manager

helm install cert-manager --namespace cert-manager jetstack/cert-manager \
    --set installCRDs=true \
    --set extraArgs[0]=--enable-certificate-owner-ref=true \
    --version 1.10 \
    --wait
fi

docker build -t "${imageS3GWUI}:${UI_IMAGE_TAG}" -t "${imageS3GWUI}:latest" -f src/Dockerfile src
echo "Building s3gw-ui image Completed ✔️"
k3d image import -c s3gw-ui-testing "${imageS3GWUI}:${UI_IMAGE_TAG}"

echo "Deploying s3gw"

prepare_system_domain

echo -e "Using UI_IMAGE_TAG: \e[32m${UI_IMAGE_TAG}\e[0m"
echo -e "Using BE_IMAGE_TAG: \e[32m${BE_IMAGE_TAG}\e[0m"

deploy_s3gw_latest_released

echo
echo "Done preparing k3d environment! ✔️"
