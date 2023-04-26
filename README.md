# Setup Kustomize

This action sets up kustomize for use in actions by:

- Downloading and caching a version of `kustomize`, optionally by version, and adding to `$PATH`

```yaml
steps:
  - uses: syntaqx/setup-kustomize@v1
  - run: kustomize version
```

```yaml
steps:
  - uses: syntaqx/setup-kustomize@v1
    with:
      kustomize-version: 5.0.1
  - run: kustomize version
```
