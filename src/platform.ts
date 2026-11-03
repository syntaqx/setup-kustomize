export type KustomizeOS = 'linux' | 'darwin' | 'windows'

export interface Platform {
  /** Operating system as named in kustomize release assets. */
  os: KustomizeOS
  /** CPU architecture as named in kustomize release assets. */
  arch: string
}

const OS_MAP: Partial<Record<NodeJS.Platform, KustomizeOS>> = {
  linux: 'linux',
  darwin: 'darwin',
  win32: 'windows',
}

const ARCH_MAP: Record<string, string> = {
  x64: 'amd64',
  arm64: 'arm64',
  arm: 'arm',
  ppc64: 'ppc64le',
  s390x: 's390x',
}

export function getPlatform(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): Platform {
  const os = OS_MAP[platform]
  if (!os) {
    throw new Error(`Unsupported operating system: ${platform}`)
  }
  const mappedArch = ARCH_MAP[arch]
  if (!mappedArch) {
    throw new Error(`Unsupported architecture: ${arch}`)
  }
  return { os, arch: mappedArch }
}

export function binaryName(os: KustomizeOS): string {
  return os === 'windows' ? 'kustomize.exe' : 'kustomize'
}
