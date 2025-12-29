# tap

The unit tests use [node-tap](https://node-tap.org).

## Prerequisites

To install the prerequisites as development dependencies:

```sh
npm install --save-dep node-tap @types/tap ts-node typescript
```

## TypeScript

The tests can be written in TypeScript, and do not need to be compiled
separately.

To configure TS to compile the tests, add a `tests/tsconfig.json`:

```json
{
  /* https://www.typescriptlang.org/tsconfig */
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "../tsconfig-common.json",
  "compilerOptions": {
  },
  "exclude": [
    "./tap"
  ],
  "include": [
  ]
}
```

and a `tests/package.json`:

```jaon
{
  "type": "module"
}
```

## Configuration

The TAP configuration should be stored in `.taprc`:

```yml
# https://node-tap.org/cli/#configuration

files:
  - tests/tap/*.ts

coverage-report:
  - text

reporter: base
browser: true
color: true

branches: 100
functions: 100
lines: 100
statements: 100

# jobs: 3
timeout: 30

snapshot-clean-cwd: true

allow-empty-coverage: true
allow-incomplete-coverage: true
```

To see the actual configuration:

```sh
node_modules/.bin/tap config list
```

## Test

Tests can be started using scripts:

```json
    "test": "npm run test-tap-run",
    "test-ci": "npm run test-tap-run",
    "test-tap-run": "tap run",
    "test-tap-config-list": "tap config list",
```

## Known issues

- `ts-node` requires a top `tsconfig.json`, currently there is no
configuration to pass a different path

## Links

- <https://node-tap.org>
- <https://www.npmjs.com/package/ts-node>
