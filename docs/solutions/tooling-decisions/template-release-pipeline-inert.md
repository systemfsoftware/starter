---
title: A template repository must ship its release pipeline inert
date: 2026-09-10
category: tooling-decisions
module: starter template toolchain
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - a repository is distributed as a template, scaffold, or starting point
  - a CI pipeline derives its work from the state of the workspace it runs in
  - a placeholder package exists before any real package does
tags: [template-repo, release-gate, placeholder-package, changeset-intent]
---

# A template repository must ship its release pipeline inert

## Context

The template repository ran its own release pipeline on every push to the default
branch. The workspace held one placeholder package, a reserved name and version
carrying publish metadata but no real content, and the pipeline read it as a real
release target. The phase planner computed an owed release for the untagged
placeholder version, selected the publish phase, and the publish job stopped at the
missing changelog for a version that had never been versioned.

The boundary condition is a workspace whose packages are all placeholders: a
repository just generated from the template, before the consumer claims a package.
Released repositories never reach it, because their released versions carry tags.

Residual: a repository that has already been de-templated still owes a release for
its never-versioned initial version, for the same reason — tag absence alone marks a
version owed. That bootstrap gap needs its own rule (a release is owed only when its
changelog artifact exists) and is deliberately not addressed here.

## Mechanism

1. Release-cycle enumeration filtered only on the manifest's `private` flag, so a
   public placeholder entered the cycle.
2. Cycle membership was decided by tag absence alone: any workspace version without
   a matching remote tag counted as owed.
3. The phase decision short-circuits on owed, so `owed > 0` always beat pending
   change intents. The version job could never run first, and so could never produce
   the changelog the publish job asserts.
4. The changeset gate demanded a change intent for any edit under the package tree,
   because it used the same `private`-only filter. The repository satisfied it with a
   standing no-release intent — a gate certifying nothing.

$$\text{released}(p) = \text{publishable}(p) \;\wedge\; \text{tagged}(p)$$

The pipeline evaluated $\text{tagged}$ alone.

## Why This Works

**Invariant: a release target is a package that is publishable by intent.** Template
placeholders and private tooling packages are not release targets. Every gate that
selects release work must agree on one predicate, and the manifest's `private` flag
is that predicate: it is also what the package manager honors, so the pipeline and
the publish path cannot disagree.

Corollary: the phase decision must never select publish work for a workspace with no
publishable package, even when change intents are pending. Publishability is checked
before owed-ness, not after.

Anti-pattern code smell: the package-publishability test written inline in more than
one workspace query. Two copies drift; the shared predicate is the fix.

## Verification

Verification is behavioral, at the seam the pipeline itself uses: run the phase
planner and the changeset gate against the workspace and read their verdicts. Both
directions must be exercised — an all-private workspace yields no phase and no intent
demand; a single non-private package yields the pending phase. The CI jobs that call
them are the standing gate.

No unit test is proposed for these scripts. A test that spawns the planner or the
gate runs them as child processes, which the test-layer admission gate refuses
outright; the scripts' own runs plus the CI jobs are the observable contract.

## When to Apply

- Authoring or copying a release pipeline into a template, scaffold, or example
  repository.
- A placeholder package exists in a workspace whose CI derives work from workspace
  state.
- Adding a second gate that selects packages for release.

## Related

- `docs/solutions/tooling-decisions/self-name-imports-type-aware-lint.md`
