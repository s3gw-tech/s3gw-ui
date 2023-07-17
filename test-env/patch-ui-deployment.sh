#!/bin/bash

# By calling this script, we patch the s3gw-ui deployment as this:
#
# 1) We create a PVC and a helper copier pod that mounts that PVC.
# 2) We copy the built ui on the PVC by calling an equivalent `kubectl cp` command
#    on the copier pod.
#
# 3) We mount the same PVC on the s3gw-ui pod at the location where the application
#    expects the build to be.
#
# Patching the deployment forces the s3gw-ui pod to restart with the new build in place.

set -e
timeout=120s

items=(
    src/s3gw_ui_backend.py
    src/backend
    src/frontend/dist/s3gw-ui
)

TAR_ITEMS=""
for item in ${items[@]}; do
  TAR_ITEMS=$TAR_ITEMS$item" "
done

echo "Creating the s3gw-ui-staging PVC ..."
cat <<EOF | kubectl apply -f -
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: s3gw-ui-staging
  namespace: s3gw-ui-testing
spec:
  storageClassName: local-path
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
EOF

echo "Creating the s3gw-ui-build-copier Pod ..."
cat <<EOF | kubectl apply -f -
---
apiVersion: v1
kind: Pod
metadata:
  name: s3gw-ui-build-copier
  namespace: s3gw-ui-testing
spec:
  volumes:
    - name: s3gw-ui-staging
      persistentVolumeClaim:
        claimName: s3gw-ui-staging
  containers:
    - name: copier
      image: busybox:stable
      command: ["/bin/sh", "-ec", "trap : TERM INT; sleep infinity & wait"]
      volumeMounts:
        - mountPath: "/srv"
          name: s3gw-ui-staging
EOF

echo "Waiting for s3gw-ui-build-copier Pod to be ready ..."
kubectl wait --for=condition=ready --timeout=$timeout pod -n s3gw-ui-testing s3gw-ui-build-copier

echo "Cleaning the content of the s3gw-ui-staging PVC ..."
kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- rm -rf /srv/s3gw-ui
kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- rm -rf /srv/backend
kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- rm -rf /srv/frontend/dist/s3gw-ui
kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- rm -rf /srv/s3gw_ui_backend.py
echo "Copying the local build on the s3gw-ui-staging PVC ..."
( tar cf - ${TAR_ITEMS}
) | kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- tar xf -
for item in ${items[@]}; do
  kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- mv $item /srv/
done

echo "Normalizing paths on destination path ..."
kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- mkdir -p /srv/frontend/dist/s3gw-ui
kubectl exec -i -n s3gw-ui-testing -c copier s3gw-ui-build-copier -- mv /srv/s3gw-ui /srv/frontend/dist/s3gw-ui

echo "Deleting the s3gw-ui-build-copier to avoid multi-attach issue between pods..."
kubectl delete pod -n s3gw-ui-testing s3gw-ui-build-copier

echo "Patching the s3gw-ui deployment to use the local build ..."

PATCH=$(cat <<EOF
{ "spec": {
        "selector": {
            "matchLabels": {
                "app.kubernetes.io/component": "ui",
                "app.kubernetes.io/instance": "s3gw-ui-testing",
                "app.kubernetes.io/name": "s3gw"
            }
        },
        "template": {
            "metadata": {
                "labels": {
                    "app.kubernetes.io/component": "ui",
                    "app.kubernetes.io/instance": "s3gw-ui-testing",
                    "app.kubernetes.io/name": "s3gw"
                },
                "annotations": {
                  "ts": "$(date +%s%N)"
                }
            },
            "spec": {
                "containers": [
                    {
                        "envFrom": [
                            {
                                "configMapRef": {
                                    "name": "s3gw-ui-testing-s3gw-ui-testing-config"
                                }
                            },
                            {
                                "secretRef": {
                                    "name": "s3gw-ui-testing-s3gw-ui-testing-creds"
                                }
                            }
                        ],
                        "imagePullPolicy": "IfNotPresent",
                        "name": "s3gw-ui",
                        "ports": [
                            {
                                "containerPort": 8080,
                                "protocol": "TCP"
                            }
                        ],
                        "volumeMounts": [
                            {
                                "mountPath": "/srv",
                                "name": "s3gw-ui-staging"
                            }
                        ]
                    }
                ],
                "volumes": [
                    {
                        "name":"s3gw-ui-staging",
                        "persistentVolumeClaim": {
                            "claimName": "s3gw-ui-staging"
                        }
                    }
                ]
            }
        }
    }
}
EOF
)

kubectl patch deployment -n s3gw-ui-testing s3gw-ui-testing-ui -p "${PATCH}"

echo "Waiting for the deployment's rollout to complete..."
kubectl rollout status deployment -n s3gw-ui-testing s3gw-ui-testing-ui --timeout=$timeout
