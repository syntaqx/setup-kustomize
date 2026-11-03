import { describe, expect, it } from 'vitest'
import { binaryName, getPlatform } from '../src/platform.js'

describe('getPlatform', () => {
  it.each([
    ['linux', 'x64', { os: 'linux', arch: 'amd64' }],
    ['linux', 'arm64', { os: 'linux', arch: 'arm64' }],
    ['linux', 'ppc64', { os: 'linux', arch: 'ppc64le' }],
    ['linux', 's390x', { os: 'linux', arch: 's390x' }],
    ['darwin', 'arm64', { os: 'darwin', arch: 'arm64' }],
    ['win32', 'x64', { os: 'windows', arch: 'amd64' }],
  ] as const)('maps %s/%s', (platform, arch, expected) => {
    expect(getPlatform(platform, arch)).toEqual(expected)
  })

  it('rejects unsupported platforms', () => {
    expect(() => getPlatform('aix', 'x64')).toThrow(/Unsupported operating system/)
    expect(() => getPlatform('linux', 'mips')).toThrow(/Unsupported architecture/)
  })
})

describe('binaryName', () => {
  it('adds .exe on Windows', () => {
    expect(binaryName('windows')).toBe('kustomize.exe')
    expect(binaryName('linux')).toBe('kustomize')
  })
})
