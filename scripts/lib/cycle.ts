import { join } from '@std/path'
import { isPublishablePackage, loadWorkspacePackages, type Pkg } from './packages.ts'
import { run } from './run.ts'

export type CycleEntry = {
  name: string
  version: string
  tag: string
  changelog: string
}

export const remoteTags = async (): Promise<Set<string>> =>
  new Set(
    (await run('git', ['ls-remote', '--tags', 'origin']))
      .split('\n')
      .filter(Boolean)
      .map((line) => line.replace(/.*refs\/tags\//, '').replace(/\^\{\}$/, '')),
  )

export const cycleOf = (pkgs: Pkg[], remote: Set<string>): CycleEntry[] => {
  const cycle: CycleEntry[] = []
  for (const pkg of pkgs) {
    if (!isPublishablePackage(pkg)) continue
    const tag = `${pkg.name}@v${pkg.version}`
    if (remote.has(tag)) continue
    cycle.push({
      name: pkg.name,
      version: pkg.version,
      tag,
      changelog: join('.changeset', 'changelogs', `${pkg.name.replace('/', '!')}@${pkg.version}.md`),
    })
  }
  return cycle
}

export const loadWorkspaceCycle = async (): Promise<CycleEntry[]> => {
  const [pkgs, remote] = await Promise.all([loadWorkspacePackages(), remoteTags()])
  return cycleOf(pkgs, remote)
}

export const loadCaptured = async (path: string): Promise<CycleEntry[]> => {
  const raw: unknown = JSON.parse(await Deno.readTextFile(path))
  if (!Array.isArray(raw)) throw new Error('captured file must be a JSON array')
  return raw as CycleEntry[]
}

export const unpublishedOf = async (cycle: CycleEntry[]) => {
  const published = await Promise.all(
    cycle.map(async (entry) => {
      const res = await fetch(`https://registry.npmjs.org/${entry.name.replace('/', '%2F')}/${entry.version}`)
      return res.ok
    }),
  )
  return cycle.filter((_, i) => !published[i])
}
