import { describe, expect, it } from 'vitest'
import { selectAsset, type Release } from '../src/releases.js'

function release(version: string, names: string[]): Release {
  return {
    tag_name: `kustomize/v${version}`,
    draft: false,
    prerelease: false,
    assets: names.map((name) => ({
      name,
      browser_download_url: `https://example.test/${name}`,
    })),
  }
}

// Asset lists copied from real kustomize releases.
const v583 = release('5.8.3', [
  'checksums.txt',
  'kustomize_v5.8.3_darwin_amd64.tar.gz',
  'kustomize_v5.8.3_darwin_arm64.tar.gz',
  'kustomize_v5.8.3_linux_amd64.tar.gz',
  'kustomize_v5.8.3_linux_arm64.tar.gz',
  'kustomize_v5.8.3_windows_amd64.zip',
  'kustomize_v5.8.3_windows_arm64.zip',
])
const v511 = release('5.1.1', [
  'checksums.txt',
  'kustomize_v5.1.1_darwin_amd64.tar.gz',
  'kustomize_v5.1.1_linux_amd64.tar.gz',
  'kustomize_v5.1.1_linux_arm64.tar.gz',
  'kustomize_v5.1.1_windows_amd64.tar.gz',
])
const v323 = release('3.2.3', [
  'checksums.txt',
  'kustomize_kustomize.v3.2.3_darwin_amd64',
  'kustomize_kustomize.v3.2.3_linux_amd64',
  'kustomize_kustomize.v3.2.3_windows_amd64.exe',
])

describe('selectAsset', () => {
  it('selects tar.gz archives', () => {
    const selected = selectAsset(v583, '5.8.3', { os: 'linux', arch: 'arm64' })
    expect(selected?.asset.name).toBe('kustomize_v5.8.3_linux_arm64.tar.gz')
    expect(selected?.archive).toBe('tar.gz')
  })

  it('selects Windows zip archives', () => {
    const selected = selectAsset(v583, '5.8.3', { os: 'windows', arch: 'amd64' })
    expect(selected?.asset.name).toBe('kustomize_v5.8.3_windows_amd64.zip')
    expect(selected?.archive).toBe('zip')
  })

  it('selects older Windows tar.gz archives', () => {
    const selected = selectAsset(v511, '5.1.1', { os: 'windows', arch: 'amd64' })
    expect(selected?.archive).toBe('tar.gz')
  })

  it('selects v3.2.x bare binaries', () => {
    expect(selectAsset(v323, '3.2.3', { os: 'linux', arch: 'amd64' })).toMatchObject({
      archive: 'binary',
      asset: { name: 'kustomize_kustomize.v3.2.3_linux_amd64' },
    })
    expect(selectAsset(v323, '3.2.3', { os: 'windows', arch: 'amd64' })?.archive).toBe('binary')
  })

  it('falls back to amd64 on macOS arm64 when no native build exists', () => {
    const selected = selectAsset(v511, '5.1.1', { os: 'darwin', arch: 'arm64' })
    expect(selected?.asset.name).toBe('kustomize_v5.1.1_darwin_amd64.tar.gz')
    expect(selected?.arch).toBe('amd64')
  })

  it('does not fall back on Linux', () => {
    expect(selectAsset(v511, '5.1.1', { os: 'linux', arch: 'ppc64le' })).toBeNull()
  })

  it('does not match a different version', () => {
    expect(selectAsset(v583, '5.8.30', { os: 'linux', arch: 'amd64' })).toBeNull()
  })
})
