# Setup Kustomize

[![CI](https://github.com/syntaqx/setup-kustomize/actions/workflows/ci.yml/badge.svg)](https://github.com/syntaqx/setup-kustomize/actions/workflows/ci.yml)

Installs [kustomize](https://github.com/kubernetes-sigs/kustomize) and adds it to the `PATH`:

- **Any version.** `latest`, an exact version, or a semver range. New kustomize releases work as
  soon as they're published, with no update to this action needed.
- **Verified.** Every download is checked against the release's published SHA-256 checksum.
- **Cached.** Installs go into the runner tool cache, so an exact version already in the cache is
  reused without any network access.
- **Cross-platform.** Linux, macOS and Windows, on x64 and arm64 (plus ppc64le and s390x on Linux).
- **No rate-limit flakes.** Release lookups are authenticated with the workflow token.

## Usage

```yaml
steps:
  - uses: syntaqx/setup-kustomize@v2
  - run: kustomize build ./overlays/production
```

Pin a version:

```yaml
- uses: syntaqx/setup-kustomize@v2
  with:
    kustomize-version: 5.4.3
```

Track the newest release in a major or minor line:

```yaml
- uses: syntaqx/setup-kustomize@v2
  with:
    kustomize-version: '5' # or '5.4', '^5.3.0', '>=4 <6'
```

## Inputs

| Name                | Default                                                         | Description                                                                                                                                    |
| ------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `kustomize-version` | `latest`                                                        | `latest`, an exact version (`5.4.3` or `v5.4.3`), or a semver range (`5`, `5.4`, `^5.3.0`). Ranges resolve to the newest release that matches. |
| `token`             | `github.token` on github.com, empty on GitHub Enterprise Server | Token for querying kustomize releases on api.github.com.                                                                                       |

## Outputs

| Name        | Description                                                   |
| ----------- | ------------------------------------------------------------- |
| `version`   | Installed version without a leading `v`, for example `5.4.3`. |
| `path`      | Absolute path to the kustomize binary.                        |
| `cache-hit` | `true` if kustomize was already in the runner tool cache.     |

## Supported versions

Every `kustomize/v*` release from v3.2.1 onwards. If a version has no native build for the
runner (for example macOS arm64 before v5.0.0), the amd64 build is installed and runs under
Rosetta 2 or Windows emulation, and a warning is logged. v5.2.0 is the only release without
published checksums; it installs with a warning.

## Upgrading from v1

v1 ran kustomize's `install_kustomize.sh` and moved the binary into `/usr/local/bin` with `sudo`.
v2 is a JavaScript action: it installs into the runner tool cache and adds that directory to
`PATH`. `kustomize-version` works the same way and now also accepts a `v` prefix and ranges. If a
workflow used `/usr/local/bin/kustomize` directly, switch it to `kustomize` or to the `path` output.

## Development

```sh
npm ci
npm run all # format check, typecheck, unit tests, build
```

`dist/` is not committed to `main`. CI builds it and tests the action on every supported runner.

### Releasing

Run the **Release** workflow from the Actions tab with a version such as `2.1.0`. It builds
`dist/`, commits it on a release-only commit, tags `v2.1.0`, moves the `v2` tag, and creates the
GitHub release. To list the release on the Marketplace, edit the release afterwards and tick
**Publish this Action to the GitHub Marketplace**.
