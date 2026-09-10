#!/usr/bin/env -S deno run --config=scripts/deno.json --allow-read --allow-write --allow-run=git,pnpm --allow-import --allow-net=jsr.io

import { parseArgs } from '@std/cli/parse-args'
import { expandGlob } from '@std/fs/expand-glob'
import { basename } from '@std/path'
import { cycleOf, remoteTags } from './lib/cycle.ts'
import { isPublishablePackage, loadWorkspacePackages } from './lib/packages.ts'

let pending = 0
for await (const entry of expandGlob('.changeset/*.md')) {
  if (basename(entry.path) !== 'README.md') pending++
}

const packages = await loadWorkspacePackages()
const publishable = packages.filter(isPublishablePackage).length
const owed = publishable === 0 ? 0 : cycleOf(packages, await remoteTags()).length

let phase = 'none'
if (publishable > 0 && owed > 0) phase = 'publish'
else if (publishable > 0 && pending > 0) phase = 'version'

const outputs = [`phase=${phase}`, `pending_intents=${pending}`, `this_cycle=${owed}`, `publishable=${publishable}`]
  .join('\n')

console.error(
  publishable === 0
    ? 'plan-release: no publishable package in the workspace -> phase=none'
    : `plan-release: publishable=${publishable} pending_intents=${pending} this_cycle=${owed} -> phase=${phase}`,
)

const { output } = parseArgs(Deno.args, { string: ['output'] })
if (output) await Deno.writeTextFile(output, `${outputs}\n`, { append: true })
else console.log(outputs)
