import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, readdir, rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { digestToSha256, lookupChecksum, parseChecksums, sha256File } from './checksum.js'
import { binaryName, type Platform } from './platform.js'
import {
  findChecksumsAsset,
  type KustomizeReleases,
  type Release,
  type SelectedAsset,
} from './releases.js'

export const TOOL_NAME = 'kustomize'

async function expectedSha256(
  client: KustomizeReleases,
  release: Release,
  selected: SelectedAsset,
): Promise<string | null> {
  const checksums = findChecksumsAsset(release)
  if (checksums) {
    const sums = parseChecksums(await client.getText(checksums.browser_download_url))
    const sum = lookupChecksum(sums, selected.asset.name)
    if (sum) return sum
  }
  return digestToSha256(selected.asset.digest)
}

async function verify(path: string, expected: string | null, assetName: string): Promise<void> {
  if (!expected) {
    core.warning(`No published checksum for ${assetName}; skipping checksum verification.`)
    return
  }
  const actual = await sha256File(path)
  if (actual !== expected) {
    throw new Error(
      `Checksum mismatch for ${assetName}: expected sha256 ${expected}, got ${actual}.`,
    )
  }
  core.info(`Verified sha256 ${actual}`)
}

/** Finds the kustomize binary inside an extracted archive (archive layouts vary by version). */
async function locateBinary(dir: string, platform: Platform): Promise<string> {
  const wanted = binaryName(platform.os)
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  const match = entries.find((e) => e.isFile() && e.name === wanted)
  if (!match) {
    throw new Error(`Could not find ${wanted} in the downloaded archive.`)
  }
  return join(match.parentPath, match.name)
}

/**
 * Downloads, verifies and caches the given kustomize release.
 * Returns the tool cache directory containing the kustomize binary.
 */
export async function install(
  client: KustomizeReleases,
  release: Release,
  version: string,
  selected: SelectedAsset,
  platform: Platform,
): Promise<string> {
  const { asset } = selected
  core.info(`Downloading ${asset.browser_download_url}`)
  // Keep the asset's file name: Windows PowerShell's Expand-Archive requires a .zip extension.
  const tempDir = join(process.env.RUNNER_TEMP || tmpdir(), randomUUID())
  const downloaded = await tc.downloadTool(asset.browser_download_url, join(tempDir, asset.name))
  await verify(downloaded, await expectedSha256(client, release, selected), asset.name)

  const exe = binaryName(platform.os)
  let binary: string
  if (selected.archive === 'binary') {
    // v3.2.x shipped bare binaries instead of archives.
    const dir = join(tempDir, 'bin')
    await mkdir(dir)
    binary = join(dir, exe)
    await rename(downloaded, binary)
  } else {
    const extracted =
      selected.archive === 'zip' ? await tc.extractZip(downloaded) : await tc.extractTar(downloaded)
    binary = await locateBinary(extracted, platform)
  }

  if (platform.os !== 'windows') {
    await chmod(binary, 0o755)
  }

  return tc.cacheFile(binary, exe, TOOL_NAME, version, platform.arch)
}
