#!/usr/bin/env bash

version="$1"

curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh"

if [ -z "$version" ]; then
  ./install_kustomize.sh
else
  ./install_kustomize.sh "$version"
fi

mv kustomize /usr/local/bin/kustomize
chmod +x /usr/local/bin/kustomize
