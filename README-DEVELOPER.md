[![npm (scoped)](https://img.shields.io/npm/v/@xpack/xpm-liquid.svg)](https://www.npmjs.com/package/@xpack/xpm-liquid/)
[![license](https://img.shields.io/github/license/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/blob/xpack/LICENSE)
[![TS-Standard - Typescript Standard Style Guide](https://badgen.net/badge/code%20style/ts-standard/blue?icon=typescript)](https://github.com/standard/ts-standard/)
[![Actions Status](https://github.com/xpack/xpm-liquid-ts/workflows/CI%20on%20Push/badge.svg)](https://github.com/xpack/xpm-liquid-ts/actions/)
[![GitHub issues](https://img.shields.io/github/issues/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/issues/)
[![GitHub pulls](https://img.shields.io/github/issues-pr/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/pulls/)

# Developer info

This page documents the prerequisites and procedures used during the
development of the `@xpack/xpm-liquid` module.

This project is written in TypeScript.

## Prerequisites

The prerequisites are:

- git
- node >= 10.x & npm
- <https://www.npmjs.com/package/@tsconfig/node10>

## Clone the project repository

The project is hosted on GitHub:

- <https://github.com/xpack/xpm-liquid-ts.git>

To clone the `master` branch, use:

```sh
mkdir ${HOME}/Work/vscode-extensions
cd ${HOME}/Work/vscode-extensions
git clone https://github.com/xpack/xpm-liquid-ts.git xpm-liquid-ts.git
```

For development, to clone the `develop` branch, use:

```sh
git clone --branch develop \
  https://github.com/xpack/xpm-liquid-ts.git xpm-liquid-ts.git
```

## Satisfy dependencies

```sh
npm install
```

To later check for newer dependencies:

```sh
npm outdated
```

## Add links for development

```sh
cd xpm-liquid-ts.git
npm link
```

And in projects refering this:

```sh
npm link @xpack/xpm-liquid
```

## Start the compile background task

```sh
npm run compile-watch
```

## Language standard compliance

The current version is TypeScript 4:

- <https://www.typescriptlang.org>
- <https://www.typescriptlang.org/docs/handbook>

## Standard style

As style, the project uses the TypeScript variant of
[Standard Style](https://standardjs.com/#typescript),
automatically checked at each commit via CI.

Generally, to fit two editor windows side by side in a screen,
all files should limit the line length to 80.

```js
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
```

The syntax for other exceptions is:

```js
// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
```

Known and accepted exceptions:

- `/* eslint-disable @typescript-eslint/no-floating-promises */` in tests

To manually fix compliance with the style guide (where possible):

```console
$ npm run fix

> @xpack/xpm-liquid@1.2.1 fix
> ts-standard --fix src
```

## Tests

The tests use the [`node-tap`](http://www.node-tap.org) framework
(_A Test-Anything-Protocol library for Node.js_, written by Isaac Schlueter).

Tests can be written in TypeScript, assuming `ts-node` is also installed
(<https://node-tap.org/docs/using-with/#using-tap-with-typescript>)

As for any `npm` package, the standard way to run the project tests is via
`npm run test`:

```sh
cd xpm-liquid-ts.git
npm install
npm run test
```

A typical test result looks like:

```console
% npm run test

> @xpack/xpm-liquid@1.2.1 pretest
> npm run compile && npm run lint


> @xpack/xpm-liquid@1.2.1 compile
> tsc -p ./


> @xpack/xpm-liquid@1.2.1 lint
> ts-standard src


> @xpack/xpm-liquid@1.2.1 test
> npm run test-tap100 -s

tests/tap/010-functions.ts ............................ 4/4
tests/tap/020-map.ts ................................ 26/26
tests/tap/030-substitutions.ts ...................... 24/24
total ............................................... 54/54

  52 passing (1s)

  ok
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |     100 |      100 |     100 |     100 |
 xpm-liquid.ts |     100 |      100 |     100 |     100 |
---------------|---------|----------|---------|---------|-------------------
%
```

To run a specific test with more verbose output, use `npm run tap`:

```console
% npm run tap tests/tap/010-functions.ts

> @xpack/xpm-liquid@1.2.1 tap
> tap --ts --reporter=spec --timeout 300 --no-coverage "tests/tap/010-functions.ts"


tests/tap/010-functions.ts
  filterPath
    ✓ preserves posix path separator /
    ✓ changes to lowercase
    ✓ replaces by dash
    ✓ replaces two dashes
    ✓ replaces three dashes


  5 passing (1s)
%
```

### Coverage tests

Coverage tests are a good indication on how much of the source files is
exercised by the tests. Ideally all source files should be covered 100%,
for all 4 criteria (statements, branches, functions, lines).

Thus, passing coverage tests was enforced for all tests, as seen before.

### Continuous Integration (CI)

The continuous integration tests are performed via
[GitHub Actions](https://github.com/features/actions) on Ubuntu,
Windows and macOS, using node 10, 12, 14.

## Tricks & tips

To trace module resolution:

```json
    "compile": "tsc --traceResolution  -p ./",
```

## TSDoc (TypeScript documentation)

- <https://tsdoc.org>
- <https://typedoc.org/guides/doccomments/>
- <https://jsdoc.app/index.html>
