import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

/** Parses a `sha256sum`-style checksums file into a map of file name to lowercase hex digest. */
export function parseChecksums(text: string): Map<string, string> {
  const sums = new Map<string, string>()
  for (const line of text.split(/\r?\n/)) {
    const match = /^([a-fA-F0-9]{64})\s+\*?(\S+)\s*$/.exec(line.trim())
    if (match?.[1] && match[2]) {
      sums.set(match[2], match[1].toLowerCase())
    }
  }
  return sums
}

/**
 * Looks up an asset's checksum. The v3.2.x checksum files list `kustomize_kustomize/v3.2.3_…`
 * while the uploaded assets are named `kustomize_kustomize.v3.2.3_…`.
 */
export function lookupChecksum(sums: Map<string, string>, assetName: string): string | null {
  return (
    sums.get(assetName) ??
    sums.get(assetName.replace(/^kustomize_kustomize\.v/, 'kustomize_kustomize/v')) ??
    null
  )
}

/** Extracts the hex digest from a GitHub asset digest such as `sha256:abc…`. */
export function digestToSha256(digest: string | null | undefined): string | null {
  const match = /^sha256:([a-fA-F0-9]{64})$/.exec(digest ?? '')
  return match?.[1] ? match[1].toLowerCase() : null
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk as Buffer)
  }
  return hash.digest('hex')
}
