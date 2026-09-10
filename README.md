# starter

GitHub template for any TypeScript starter project. Toolchain cloned from
`omp-claude-compat`: pnpm workspaces + turbo + changesets + husky +
commitlint + dprint + oxlint + vitest + stryker + OIDC npm release.

## Use

1. **Use this template** on GitHub → clone your new repo.
2. Replace every `TODO` (`packages/starter/package.json` name/author/description,
   `.github/workflows/force-release.yml`).
3. Claim the package: rename `packages/starter` to your package, drop
   `"private": true` from its `package.json`, and update `repository.directory`.
4. Register the package as npm trusted publisher (repo + `release.yml` workflow)
   before first publish — see `.changeset/README.md`.
5. `pnpm install && pnpm gate:tasks && pnpm gate:dist`.

While the package is still `private`, the release pipeline is inert: `Release`
plans no phase, `Changeset Check` ignores `packages/` edits, and `Force Release`
refuses the dispatch. Step 3 is what arms it.
