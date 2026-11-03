import { describe, expect, it } from 'vitest'
import { parseVersionInput, resolveVersion, versionFromTag } from '../src/version.js'

describe('parseVersionInput', () => {
  it.each(['', '  ', 'latest', 'LATEST'])('treats %j as latest', (input) => {
    expect(parseVersionInput(input)).toEqual({ kind: 'latest' })
  })

  it.each(['5.4.1', 'v5.4.1', ' 5.4.1 ', 'kustomize/v5.4.1'])('parses %j as exact', (input) => {
    expect(parseVersionInput(input)).toEqual({ kind: 'exact', version: '5.4.1' })
  })

  it.each([
    ['5', '>=5.0.0 <6.0.0-0'],
    ['v5.4', '>=5.4.0 <5.5.0-0'],
    ['^5.3.0', '>=5.3.0 <6.0.0-0'],
  ])('parses %j as a range', (input, range) => {
    expect(parseVersionInput(input)).toEqual({ kind: 'range', range })
  })

  it('rejects garbage', () => {
    expect(() => parseVersionInput('not-a-version')).toThrow(/Invalid kustomize-version/)
  })
})

describe('versionFromTag', () => {
  it('extracts versions from kustomize tags only', () => {
    expect(versionFromTag('kustomize/v5.8.3')).toBe('5.8.3')
    expect(versionFromTag('api/v0.20.1')).toBeNull()
    expect(versionFromTag('kyaml/v0.18.1')).toBeNull()
    expect(versionFromTag('v3.3.1')).toBeNull()
  })
})

describe('resolveVersion', () => {
  const available = ['3.8.0', '4.5.7', '5.0.0', '5.4.3', '5.8.3']

  it('picks the newest for latest', () => {
    expect(resolveVersion({ kind: 'latest' }, available)).toBe('5.8.3')
  })

  it('picks the newest matching a range', () => {
    expect(resolveVersion(parseVersionInput('4'), available)).toBe('4.5.7')
    expect(resolveVersion(parseVersionInput('5.4'), available)).toBe('5.4.3')
  })

  it('returns null when nothing matches', () => {
    expect(resolveVersion(parseVersionInput('6'), available)).toBeNull()
    expect(resolveVersion({ kind: 'exact', version: '9.9.9' }, available)).toBeNull()
  })
})
