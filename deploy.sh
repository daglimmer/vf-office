#!/bin/bash
# VF 3D Office — Deploy Script
# Usage: ./deploy.sh [build|push|deploy|all]
set -e

PROJECT_DIR="/opt/newsboard/mission-control/vf-3d"
REGISTRY="registry.mission-control.svc.cluster.local:5000"
NODEPORT_REGISTRY="10.75.1.211:30500"
K3S_HOST="10.75.1.211"
IMAGE="vf-office"
NAMESPACE="vf-office"

build() {
  echo ">>> Building Docker image..."
  cd "$PROJECT_DIR"
  docker build -t ${REGISTRY}/${IMAGE}:latest .
  echo "✅ Build complete"
}

push() {
  echo ">>> Pushing to local registry..."
  docker tag ${REGISTRY}/${IMAGE}:latest ${NODEPORT_REGISTRY}/${IMAGE}:latest
  docker push ${NODEPORT_REGISTRY}/${IMAGE}:latest
  echo "✅ Push complete"
}

deploy() {
  echo ">>> Deploying to K3s..."
  scp "$PROJECT_DIR/k3s-manifests.yaml" root@${K3S_HOST}:/tmp/vf-manifests.yaml
  ssh root@${K3S_HOST} "kubectl apply -f /tmp/vf-manifests.yaml"
  echo ">>> Waiting for rollout..."
  ssh root@${K3S_HOST} "kubectl rollout status deployment/${IMAGE} -n ${NAMESPACE} --timeout=120s"
  echo "✅ Deploy complete"
}

status() {
  ssh root@${K3S_HOST} "kubectl get pods,svc,ingressroute -n ${NAMESPACE}"
}

case "${1:-all}" in
  build) build ;;
  push) push ;;
  deploy) deploy ;;
  status) status ;;
  all)
    build
    push
    deploy
    status
    ;;
  *)
    echo "Usage: $0 {build|push|deploy|status|all}"
    exit 1
    ;;
esac
