import { run } from './run.ts'

export type Pkg = {
  name?: string
  version?: string
  private?: boolean
}

export const isPublishablePackage = (pkg: Pkg): pkg is { name: string; version: string } =>
  Boolean(pkg.name && pkg.version && !pkg.private)

export const loadWorkspacePackages = async (): Promise<Pkg[]> =>
  JSON.parse(await run('pnpm', ['ls', '-r', '--json', '--depth=-1'])) as Pkg[]
