import { HttpClient } from '@actions/http-client'
import type { Platform } from './platform.js'
import { tagForVersion, versionFromTag } from './version.js'

const API_URL = 'https://api.github.com/repos/kubernetes-sigs/kustomize'
const USER_AGENT = 'syntaqx/setup-kustomize'
const PER_PAGE = 100

export interface ReleaseAsset {
  name: string
  browser_download_url: string
  /** `sha256:<hex>`; only present on assets uploaded after GitHub started recording digests. */
  digest?: string | null
}

export interface Release {
  tag_name: string
  draft: boolean
  prerelease: boolean
  assets: ReleaseAsset[]
}

export type ArchiveType = 'tar.gz' | 'zip' | 'binary'

export interface SelectedAsset {
  asset: ReleaseAsset
  archive: ArchiveType
  /** Architecture of the selected asset; differs from the requested one on emulation fallback. */
  arch: string
}

export class KustomizeReleases {
  private readonly http: HttpClient

  constructor(token?: string) {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    this.http = new HttpClient(USER_AGENT, [], { headers })
  }

  /** Fetches a single kustomize release, or null if it does not exist. */
  async getRelease(version: string): Promise<Release | null> {
    const tag = encodeURIComponent(tagForVersion(version))
    return this.getJson<Release>(`${API_URL}/releases/tags/${tag}`)
  }

  /** Lists all published (non-draft, non-prerelease) kustomize CLI releases. */
  async listReleases(): Promise<Release[]> {
    const releases: Release[] = []
    for (let page = 1; ; page++) {
      const batch =
        (await this.getJson<Release[]>(`${API_URL}/releases?per_page=${PER_PAGE}&page=${page}`)) ??
        []
      releases.push(...batch)
      if (batch.length < PER_PAGE) break
    }
    return releases.filter((r) => !r.draft && !r.prerelease && versionFromTag(r.tag_name))
  }

  async getText(url: string): Promise<string> {
    const res = await this.http.get(url)
    const status = res.message.statusCode ?? 0
    const body = await res.readBody()
    if (status < 200 || status >= 300) {
      throw new Error(`GET ${url} failed with HTTP ${status}`)
    }
    return body
  }

  private async getJson<T>(url: string): Promise<T | null> {
    try {
      const res = await this.http.getJson<T>(url)
      return res.result
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 403 || status === 429) {
        throw new Error(
          `GitHub API rate limit hit while querying kustomize releases (HTTP ${status}). ` +
            `Pass a token via the "token" input, or pin an exact kustomize-version that is ` +
            `already in the runner's tool cache.`,
        )
      }
      if (status === 401) {
        throw new Error(
          'GitHub API rejected the token (HTTP 401). On GitHub Enterprise Server, pass a ' +
            'github.com token via the "token" input or leave it empty.',
        )
      }
      throw error
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findAsset(
  release: Release,
  version: string,
  os: string,
  arch: string,
): SelectedAsset | null {
  // Matches every naming scheme kustomize has used:
  //   kustomize_v5.8.3_linux_amd64.tar.gz, kustomize_v5.8.3_windows_amd64.zip,
  //   kustomize_kustomize.v3.2.3_linux_amd64 (raw binary, v3.2.x)
  const pattern = new RegExp(
    `^kustomize_(?:kustomize\\.)?v${escapeRegExp(version)}_${os}_${arch}(\\.tar\\.gz|\\.zip|\\.exe)?$`,
  )
  for (const asset of release.assets) {
    const match = pattern.exec(asset.name)
    if (!match) continue
    const ext = match[1]
    const archive: ArchiveType = ext === '.tar.gz' ? 'tar.gz' : ext === '.zip' ? 'zip' : 'binary'
    return { asset, archive, arch }
  }
  return null
}

/**
 * Selects the release asset for the platform. On macOS and Windows arm64, falls back to the
 * amd64 build (Rosetta 2 / Windows x64 emulation) when no native arm64 build was published.
 */
export function selectAsset(
  release: Release,
  version: string,
  platform: Platform,
): SelectedAsset | null {
  const native = findAsset(release, version, platform.os, platform.arch)
  if (native) return native
  if (platform.arch === 'arm64' && platform.os !== 'linux') {
    return findAsset(release, version, platform.os, 'amd64')
  }
  return null
}

export function findChecksumsAsset(release: Release): ReleaseAsset | undefined {
  return release.assets.find((a) => a.name === 'checksums.txt')
}
