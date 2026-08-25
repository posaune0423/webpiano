# Linting

webpiano uses Oxlint 1.80.0 with `oxlint-tsgolint` 7.0.2001. ESLint and `@posaune0423/eslint-config` are not runtime or development dependencies.

The shared config was converted once with:

```sh
bunx @oxlint/migrate@1.80.0 webpiano-migrate.config.mjs --type-aware --details
```

The generated result was compared with `oxlint --rules` and then reduced to rules relevant to a single Next.js application.

## Coverage

| Source area                      | Status                  | Implementation                                                                                      |
| -------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| ESLint recommended correctness   | Native                  | Oxlint `eslint` plugin and correctness category                                                     |
| TypeScript strict/type-checked   | Native + tsgolint       | `typescript/*`, `options.typeAware`, `--type-aware --type-check`                                    |
| Import ordering and type imports | Native                  | `import/*` and `typescript/consistent-type-imports`                                                 |
| Unicorn and kebab-case filenames | Native                  | Selected `unicorn/*` rules                                                                          |
| React Hooks and React Compiler   | Native                  | `react/rules-of-hooks`, `react/exhaustive-deps`, compiler rules                                     |
| Next.js                          | Native                  | `nextjs/*` rules                                                                                    |
| Accessibility                    | Native                  | `jsx-a11y/*` rules                                                                                  |
| Promise and Node                 | Native                  | Selected `promise/*` and `node/*` rules                                                             |
| Security                         | JavaScript plugin       | `eslint-plugin-security` loaded as `security`                                                       |
| You Might Not Need an Effect     | Evaluated, not retained | Its ESLint peer would retain ESLint; native React Compiler/Hooks rules cover the enforceable subset |

## Deliberately unsupported

Oxlint 1.80.0 does not implement a number of legacy `eslint-plugin-n` rules and legacy class-component rules from `@eslint-react`. They are not replaced with prompt-only conventions. The application uses TypeScript, Next.js build validation, native React Compiler rules, and dependency checks instead.

The old effect plugin rules `no-empty-effect` and `no-pass-ref-to-parent` no longer exist in the current 1.0.2 package. Its remaining rules were successfully loaded by Oxlint, but the package declares an ESLint peer and Bun therefore installed ESLint 10 into the final lockfile. To keep the repository ESLint-free, the plugin was removed in favor of Oxlint’s native `react/set-state-in-effect`, `react/static-components`, Hooks, purity, refs, immutability, and React Compiler rules. Dynamic filesystem and object-index security warnings are disabled only in repository contract tests, where paths are controlled by the test itself.

## Commands

```sh
bun run lint
bun run typecheck
```
