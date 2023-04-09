# tap

This folder defines the unit tests, using `node-tap`

The tests are written in TypeScript, and do not need to be compiled
separately.

## Prerequisites

To install the prerequisites as development dependencies:

```sh
npm install --save-dep node-tap @types/tap c8 ts-node typescript
```

Note: c8 is required since the current `tap` version does not
support coverage.

## Configuration

To configure mocha to use the ES modules, add a property to `package.json`:

```json
  "tap": {
    "check-coverage": false,
    "coverage": false,
    "files": [
      "tests/tap/*.ts"
    ],
    "node-arg": [
      "--loader=ts-node/esm"
    ],
    "reporter": "classic",
    "timeout": 30,
    "ts": true
  },
```

To see the available configuration variables:

```sh
node_modules/.bin/tap --dump-config
```

## Test

Tests can be started using scripts:

```json
    "pretest-100": "npm run compile",
    "pretest-100-c8": "npm run compile",
    "tap": "tap --reporter=spec",
    "tap-c8": "c8 tap --reporter=spec",
    "test-tap": "tap",
    "test-tap-coverage": "tap --coverage",
    "test-tap-coverage-c8": "c8 -- tap",
    "test-tap-coverage-100": "tap --coverage --100",
    "test-tap-coverage-100-c8": "c8 --100 -- tap",
    "test": "npm run test-tap -s",
    "test-100": "npm run test-tap-coverage-100 -s",
    "test-100-c8": "npm run test-tap-coverage-100-c8 -s",
```

## Known issues

- coverage checks for projects with ES6 modules is not yet supported; use `c8`
- `ts-node` requires a top `tsconfig.json`, currently there is no
configuration to pass a different path

## Links

- <https://node-tap.org>
- <https://github.com/bcoe/c8>
- <https://www.npmjs.com/package/ts-node>
