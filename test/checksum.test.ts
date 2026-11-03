import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { digestToSha256, lookupChecksum, parseChecksums, sha256File } from '../src/checksum.js'

const SUM = 'cb9e31198d3f63b44848bd0afc4c8efc56e6cfef9c93a4a39a211940e6decd61'

describe('parseChecksums', () => {
  it('parses sha256sum output, including binary-mode and CRLF lines', () => {
    const sums = parseChecksums(
      `${SUM}  kustomize_v5.8.3_linux_amd64.tar.gz\r\n` +
        `${SUM.toUpperCase()} *kustomize_v5.8.3_windows_amd64.zip\n\nnot a checksum line\n`,
    )
    expect(sums.get('kustomize_v5.8.3_linux_amd64.tar.gz')).toBe(SUM)
    expect(sums.get('kustomize_v5.8.3_windows_amd64.zip')).toBe(SUM)
    expect(sums.size).toBe(2)
  })
})

describe('lookupChecksum', () => {
  it('handles the v3.2.x naming mismatch', () => {
    const sums = parseChecksums(`${SUM}  kustomize_kustomize/v3.2.3_linux_amd64\n`)
    expect(lookupChecksum(sums, 'kustomize_kustomize.v3.2.3_linux_amd64')).toBe(SUM)
    expect(lookupChecksum(sums, 'kustomize_v3.2.3_linux_amd64')).toBeNull()
  })
})

describe('digestToSha256', () => {
  it('extracts sha256 digests', () => {
    expect(digestToSha256(`sha256:${SUM}`)).toBe(SUM)
    expect(digestToSha256(null)).toBeNull()
    expect(digestToSha256('sha512:abc')).toBeNull()
  })
})

describe('sha256File', () => {
  it('hashes file contents', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'setup-kustomize-')), 'f')
    await writeFile(file, 'hello\n')
    expect(await sha256File(file)).toBe(
      '5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03',
    )
  })
})
