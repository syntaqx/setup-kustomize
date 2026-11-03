import * as semver from 'semver'

export type VersionSpec =
  { kind: 'latest' } | { kind: 'exact'; version: string } | { kind: 'range'; range: string }

const TAG_PREFIX = 'kustomize/v'

/**
 * Parses the `kustomize-version` input.
 *
 * Accepts `latest` (or empty), an exact version (`5.4.1`, `v5.4.1`, `kustomize/v5.4.1`),
 * a partial version (`5`, `5.4`) or any semver range (`^5.3.0`, `>=4 <5`).
 */
export function parseVersionInput(input: string): VersionSpec {
  let value = input.trim()
  if (value === '' || value.toLowerCase() === 'latest') {
    return { kind: 'latest' }
  }
  if (value.startsWith('kustomize/')) {
    value = value.slice('kustomize/'.length)
  }
  value = value.replace(/^v(?=\d)/, '')

  if (/^\d+\.\d+\.\d+$/.test(value)) {
    return { kind: 'exact', version: value }
  }
  const range = semver.validRange(value)
  if (range) {
    return { kind: 'range', range }
  }
  throw new Error(
    `Invalid kustomize-version "${input}". Use "latest", an exact version such as "5.4.1", ` +
      `or a semver range such as "5", "5.4" or "^5.3.0".`,
  )
}

/** Returns the version for a `kustomize/vX.Y.Z` release tag, or null for any other tag. */
export function versionFromTag(tag: string): string | null {
  if (!tag.startsWith(TAG_PREFIX)) return null
  const version = tag.slice(TAG_PREFIX.length)
  return /^\d+\.\d+\.\d+$/.test(version) ? version : null
}

export function tagForVersion(version: string): string {
  return `${TAG_PREFIX}${version}`
}

/** Picks the highest available version that satisfies the spec. */
export function resolveVersion(spec: VersionSpec, available: string[]): string | null {
  if (spec.kind === 'exact') {
    return available.includes(spec.version) ? spec.version : null
  }
  const range = spec.kind === 'latest' ? '*' : spec.range
  return semver.maxSatisfying(available, range)
}
