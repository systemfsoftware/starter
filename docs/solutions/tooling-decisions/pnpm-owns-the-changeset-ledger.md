---
title: pnpm owns the change-intent ledger, so an intent file is not a pending release
date: 2026-09-12
category: tooling-decisions
module: release-pipeline
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - "Changing how the release phase is derived from .changeset state"
  - "Changing the pending-intent count or the ledger parser"
  - "Debugging a version-packages pull request that opened with nothing to release"
tags: [change-intent, ledger, release, pnpm, versioning, phantom-pr]
---

# pnpm owns the change-intent ledger, so an intent file is not a pending release

## Context

The release planner derives a phase from two numbers: the size of the release set — workspace versions the registry does not yet serve — and how many change intents are pending. The phase decides which job runs: publish, version, or nothing. `plan-release` (invoked as `./scripts/plan-release.ts`) prints it; the Release workflow routes on it.

The trap is the second number. `pnpm version -r` **retains** the intent files after it consumes them, so counting `.changeset/*.md` answers "how many intent files exist", never "how many are pending". Read that way, every release leaves the pipeline in the version phase forever, and each push to the default branch opens a `version-packages` pull request that deletes files the previous run already consumed.

## Guidance

Treat `.changeset/ledger.yaml` as the record of consumption, and count only intents whose stem is absent from it (`countPendingIntents`). Two properties of the ledger decide whether that count is right:

- **pnpm writes it.** `pnpm change` authors the intent; `pnpm version -r` consumes it and renders the ledger (`render_ledger` / `readLedger` in pnpm). No production code in this repository writes the file — the parser's own tests write throwaway copies in a temp directory — so a change that adds a ledger reader adds no writer.
- **A bare, null-parsing key means an empty intent list.** A ledger entry's intents appear as a mapping (`dir:` plus `intents: [...]`), a sequence, or a key whose value parses as YAML null. Null is a release that consumed nothing — not an entry the parser failed to read. Contributing no stems is exactly what "empty" means; treating it as unparsed invents intents.

`isPublished` owns the registry probe that sizes the release set. `openReleasePr` — the release-PR shell entry point — holds the second line of defence: it refuses to open a release PR when no `apps/**/package.json` or `packages/**/package.json` differs from the base branch, so a miscount cannot by itself produce an empty release PR.

## Why This Matters

The ledger makes consumption a fact recorded beside the intent, so an intent file's presence stops implying a release is owed. Inverting that — treating the surviving file as evidence — reintroduces a phantom release PR on every cycle, and the failure is quiet: the pipeline reports a normal phase and opens a normal-looking PR.

## Architectural Invariants

**Release-set membership is a registry fact, not a version-control fact.** A package leaves the release set when its version is published, never when a branch advances or a tag is written. Tags are written downstream of the publish that would prove them, so a detector reading tag absence cannot make its own precondition true.

**A failed probe is a third outcome, never a "no".** The registry probe has three results — published, unpublished, and cannot-tell. Folding cannot-tell into unpublished reclassifies a published package as owed a release. `isPublished` therefore returns false only on an explicit 404 and throws on any other non-OK response.

**A parse failure must degrade toward "nothing consumed".** An unreadable ledger yields zero consumed stems, so more intents look pending than are. That errs toward the version phase, which the version-bump guard catches. The opposite default errs toward phase `none`, which silently skips a release — never choose it. Any new ledger shape must sit on the conservative side of this line.

**Two independent guards, not one.** The pending count and the version-bump guard answer different questions — "is an intent unrecorded?" and "did a version actually change?" A change may not weaken either on the assumption that the other covers it; the phantom PR returns if both are argued from the same signal.

## When to Apply

- Changing the phase expression in the release planner, or the pending count feeding it.
- Adding a ledger shape to the parser. A shape that fails to parse must degrade to "nothing consumed", never to "consumed".
- Explaining why `.changeset/` still holds intent files after a release landed.

## Examples

Counting files, which never reaches zero:

```ts
let pending = 0
for await (const entry of expandGlob('.changeset/*.md')) {
  if (basename(entry.path) !== 'README.md') pending++
}
```

Counting intents the ledger does not record as consumed:

```ts
const pending = await countPendingIntents('.changeset')
```

A ledger the parse must distinguish: one consumed intent, one still pending.

```yaml
"@scope/pkg@1.0.1":
  dir: packages/pkg
  intents:
    - twenty-vans-prove
```

## Prevention

- Keep a parser test for every ledger shape the reader tolerates, including the bare/null entry that means "empty".
- Keep the phase derivation testable without a registry: feed a stubbed release set and a stubbed pending count, and assert the phase.
- Keep the version-bump guard in the release-PR entry point. It is what makes a miscount survivable.

## Related

- `CONCEPTS.md` — defines change intent, release set, release phase, and the registry probe.
- `pnpm/pnpm#13125` — the bare-`intents:` null form, and why both pnpm stacks accept it on read.
