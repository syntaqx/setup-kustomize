import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { TOOL_NAME, install } from './installer.js'
import { binaryName, getPlatform } from './platform.js'
import { KustomizeReleases, selectAsset, type Release } from './releases.js'
import { parseVersionInput, resolveVersion, versionFromTag, type VersionSpec } from './version.js'

async function findRelease(
  client: KustomizeReleases,
  spec: VersionSpec,
  input: string,
): Promise<{ version: string; release: Release }> {
  if (spec.kind === 'exact') {
    const release = await client.getRelease(spec.version)
    if (!release) {
      throw new Error(
        `kustomize v${spec.version} was not found. See ` +
          'https://github.com/kubernetes-sigs/kustomize/releases for available versions.',
      )
    }
    return { version: spec.version, release }
  }

  const byVersion = new Map<string, Release>()
  for (const release of await client.listReleases()) {
    const version = versionFromTag(release.tag_name)
    if (version) byVersion.set(version, release)
  }
  const version = resolveVersion(spec, [...byVersion.keys()])
  const release = version ? byVersion.get(version) : undefined
  if (!version || !release) {
    throw new Error(`No kustomize release satisfies "${input}".`)
  }
  return { version, release }
}

/** Returns the tool cache directory for kustomize, downloading it if necessary. */
async function setup(
  input: string,
): Promise<{ version: string; toolDir: string; cacheHit: boolean }> {
  const platform = getPlatform()
  const spec = parseVersionInput(input)

  // Exact versions already in the runner's tool cache need no network access at all.
  if (spec.kind === 'exact') {
    const cached = tc.find(TOOL_NAME, spec.version, platform.arch)
    if (cached) return { version: spec.version, toolDir: cached, cacheHit: true }
  }

  const client = new KustomizeReleases(core.getInput('token') || undefined)
  const { version, release } = await findRelease(client, spec, input)
  core.info(`Resolved kustomize-version "${input}" to v${version}`)

  const cached = tc.find(TOOL_NAME, version, platform.arch)
  if (cached) return { version, toolDir: cached, cacheHit: true }

  const selected = selectAsset(release, version, platform)
  if (!selected) {
    throw new Error(
      `kustomize v${version} has no release binary for ${platform.os}/${platform.arch}.`,
    )
  }
  if (selected.arch !== platform.arch) {
    core.warning(
      `kustomize v${version} has no ${platform.os}/${platform.arch} build; ` +
        `installing ${platform.os}/${selected.arch}, which runs under emulation.`,
    )
  }
  const toolDir = await install(client, release, version, selected, platform)
  return { version, toolDir, cacheHit: false }
}

export async function run(): Promise<void> {
  try {
    const input = core.getInput('kustomize-version') || 'latest'
    const { version, toolDir, cacheHit } = await setup(input)
    if (cacheHit) core.info(`Using kustomize v${version} from the tool cache`)

    const binary = join(toolDir, binaryName(getPlatform().os))
    core.addPath(toolDir)
    core.setOutput('version', version)
    core.setOutput('path', binary)
    core.setOutput('cache-hit', String(cacheHit))

    const { stdout } = await promisify(execFile)(binary, ['version'])
    core.info(`kustomize ${stdout.trim()} is ready at ${binary}`)
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}
