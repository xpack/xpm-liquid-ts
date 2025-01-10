[![GitHub package.json version](https://img.shields.io/github/package-json/v/xpack/xpm-liquid-ts)](https://github.com/xpack/xpm-liquid-ts/blob/mater/package.json)
[![license](https://img.shields.io/github/license/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/blob/xpack/LICENSE)
[![npm (scoped)](https://img.shields.io/npm/v/@xpack/xpm-liquid.svg)](https://www.npmjs.com/package/@xpack/xpm-liquid/)

# A Node.js CommonJS/ES6 module with the Liquid substitutions code used by xpm & relatives

This project provides a **TypeScript** Node.js **CommonJS**/**ES6** module
with the code used to perform the Liquid substitutions when parsing
the xpm `package.json` file.

Note: Compatibility with legacy CommonJS is required until VS Code extensions
will be updated to import ES6 modules.

The project is open-source and hosted on GitHub as
[xpack/xpm-liquid-ts](https://github.com/xpack/xpm-liquid-ts.git).

## Maintainer & developer info

This page documents how to use this module in an user application.
For maintainer information, see the separate
[README-MAINTAINER](https://github.com/xpack/xpm-liquid-ts/blob/master/README-MAINTAINER.md)
page.

## Prerequisites

A recent [Node.js](https://nodejs.org) (>=16.0.0), since the TypeScript code
is compiled into ECMAScript 2020 code, and the tests use ES6 modules.

## Install

The module is available as
[`@xpack/xpm-liquid-ts`](https://www.npmjs.com/package/@xpack/xpm-liquid-ts)
from the public [`npmjs`](https://www.npmjs.com) repository;
it can be added as a dependency to any TypeScript or JavaScript
project with `npm install`:

```console
npm install --save @xpack/xpm-liquid-ts@latest
```

The module does not provide any executables, and generally there are no
reasons to install it globally.

## User info

This section is intended for those who want to use this module in their
own projects.

The `@xpack/xpm-liquid` module can be imported into both TypeScript
and JavaScript Node.js code.

In TypeScript and ECMAScript modules, use `import`:

```typescript
import { XpmLiquid } from '@xpack/xpm-liquid'
```

In JavaScript with CommonJS, use `require()`:

```javascript
const { XpmLiquid } = require('@xpack/xpm-liquid')
```

To use the `XpmLiquid` class, create an instance of the engine, provide the
`package.json` object, possibly the name of the configuration, and
call `performSubstitutions()`:

```js
const xpmLiquid = new XpmLiquid(log)
const xpmLiquidMap = xpmLiquid.prepareMap(packageJson, 'Debug')

const str = await xpmLiquid.performSubstitutions(
      '{{ "build" | path_join: configuration.name | to_filename }}',
      xpmLiquidMap)
```

### Available variables

The entire project `package.json` is available as the `package` variable:

- `package`

All user defined properties (project and configuration) are grouped
below the `properties` variable:

- `properties`

If the substitution refers to a certain build configuration, the configuration
name and the entire configuration content are available separately below
the `configuration` variable. Configuration properties are added to the
`properties` variables, possibly overriding project properties.

- `configuration.name`
- `configuration.*`

Variables based on the Node.js process
[environment](https://nodejs.org/dist/latest-v18.x/docs/api/process.html#process_process_env):

- `env`

Variables based on the Node.js
[os](https://nodejs.org/dist/latest-v16.x/docs/api/os.html) definitions:

- `os.EOL`
- `os.arch` (like 'arm', 'arm64', 'ia32', 'x64')
- `os.constants`
- `os.cpus`
- `os.endianness`
- `os.homedir`
- `os.hostname`
- `os.platform` (like 'darwin', 'linux', 'win32')
- `os.release`
- `os.tmpdir`
- `os.type`
- `os.version` (available since Node 12)

Variables based on the Node.js
[path](https://nodejs.org/dist/latest-v16.x/docs/api/path.html) definitions:

- `path.delimiter` (`;` for Windows, `:` for POSIX)
- `path.sep` (`\` on Windows, `/` on POSIX)
- `path.win32.delimiter` (`;`)
- `path.win32.sep` (`\`)
- `path.posix.delimiter` (`:`)
- `path.posix.sep` (`/`)

Examples:

- `"buildFolderRelativePath": "build{{ path.sep }}{{ configuration.name | to_filename }}"`

### Custom filters

Filters based on Node.js
[path](https://nodejs.org/dist/latest-v16.x/docs/api/path.html) functions:

- `path_basename`
- `path_dirname`
- `path_normalize`
- `path_join`
- `path_relative`
- `path_posix_basename`
- `path_posix_dirname`
- `path_posix_normalize`
- `path_posix_join`
- `path_posix_relative`
- `path_win32_basename`
- `path_win32_dirname`
- `path_win32_normalize`
- `path_win32_join`
- `path_win32_relative`

Filters based on Node.js
[utils](https://nodejs.org/dist/latest-v16.x/docs/api/util.html) functions:

- `util_format`

Custom filter to convert generic names to names accepted
as file names (letters, digits, dash):

- `to_filename`
- `to_posix_filename`
- `to_win32_filename`

Examples:

- `"buildFolderRelativePath": "{{ "build" | path_join: configuration.name | to_filename | downcase }"`

### Lenient if's

The undefined variables in tests do not trigger `undefined variable` messages
and allow to use defaults, like:

```
{{ env.OPTIMIZATION | default: '-O2' }}
```

### Reference

For more details on the available class definitions, including all methods,
accessors, properties, etc,
please see the TypeDoc
[reference pages](https://xpack.github.io/xpm-liquid-ts/).

## Known problems

- none

## Status

The `@xpack/xpm-liquid-ts` module is fully functional and stable.

The main clients for this module is the `xpm` CLI application and the
[VS Code xPack C/C++ Managed Build](https://github.com/xpack/vscode-xpack-extension-ts/)
extension.

## Tests

The module is tested
with 100% coverage and CI tested on every push via GitHub
[Actions](https://github.com/xpack/xpm-liquid-ts/actions).

## Compatibility notices

According to [semver](https://semver.org) rules:

> Major version X (X.y.z | X > 0) MUST be incremented if any
backwards incompatible changes are introduced to the public API.

### v2.0.0

The project was updated to dual ESM & CJS.

## License

The original content is released under the
[MIT License](https://opensource.org/license/mit/),
with all rights reserved to
[Liviu Ionescu](https://github.com/ilg-ul).
