[![npm (scoped)](https://img.shields.io/npm/v/@xpack/xpm-liquid.svg)](https://www.npmjs.com/package/@xpack/xpm-liquid)
[![license](https://img.shields.io/github/license/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/blob/xpack/LICENSE)
[![TS-Standard - Typescript Standard Style Guide](https://badgen.net/badge/code%20style/ts-standard/blue?icon=typescript)](https://github.com/standard/ts-standard)

# @xpack/xpm-liquid

This project implements the Liquid substitutions code used by xpm & relatives.

## Prerequisites

A recent [Node.js](https://nodejs.org) (>=10.x), since the TypeScript code
is compiled to ECMAScript 2018 code.

## Easy install

The module is available as
[`@xpack/xpm-liquid`](https://www.npmjs.com/package/@xpack/xpm-liquid)
from the public repository; use `npm` to install it inside the module where
it is needed:

```console
npm install @xpack/xpm-liquid@latest
```

The module does not provide any executables, and generally there are no
reasons to install it globally.

The development repository is available from the GitHub
[xpack/xpm-liquid-ts](https://github.com/xpack/xpm-liquid-ts)
project.

## User info

This section is intended for those who want to use this module in their
own projects.

The `@xpack/xpm-liquid` module can be imported in both TypeScript
and JavaScript Node.js code.

In TypeScript, use `import`:

```typescript
import { XpmLiquid } from '@xpack/xpm-liquid'
```

In JavaScript, use `require()`:

```javascript
const { XpmLiquid } = require('@xpack/xpm-liquid')
```

To use the `XpmLiquid` class, create an instance of the engine, provide the
`package.json` object, possibly the name of the configuration, and
call `perform substitutions()`:

```js
const xpmLiquid = new XpmLiquid(log)
const xpmLiquidMap = xpmLiquid.prepareMap(packagJson, 'Debug')

const var = await xpmLiquid.performSubstitutions(
      '{{ "build" | path_join: configuration.name | downcase_filename }}',
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
`properties` variable`, possibly overriding project properties.

- `configuration.name`
- `configuration.*`

Variables based on the Node.js process
[environment](https://nodejs.org/dist/latest-v14.x/docs/api/process.html#process_process_env)

- `env`

Variables based on the Node.js
[os](https://nodejs.org/dist/latest-v14.x/docs/api/os.html) definitions:

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
[path](https://nodejs.org/dist/latest-v14.x/docs/api/path.html) definitions:

- `path.delimiter` (`;` for Windows, `:` for POSIX)
- `path.sep` (`\` on Windows, `/` on POSIX)
- `path.win32.delimiter` (`;`)
- `path.win32.sep` (`\`)
- `path.posix.delimiter` (`:`)
- `path.posix.sep` (`/`)

Examples:

- `"buildFolderRelativePath": "build{{ path.sep }}{{ configuration.name | downcase_filename }}"`

### Custom filters

Filters based on Node.js
[path](https://nodejs.org/dist/latest-v14.x/docs/api/path.html) functions:

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
[utils](https://nodejs.org/dist/latest-v14.x/docs/api/util.html) functions:

- `util_format`

Custom filter to convert generic names to lower case names accepted
as file names (letters, digits, dash):

- `downcase_filename`

Examples:

- `"buildFolderRelativePath": "{{ "build" | path_join: configuration.name | downcase_filename }"`

## Compatibility notices

According to [semver](https://semver.org) requirements,
incompatible API changes require higher major numbers.

- none so far

## Maintainer & developer info

This page documents how to use this module in an user application.
For developer and maintainer information, see the separate
[README-DEVELOPER](https://github.com/xpack/xpm-liquid-ts/blob/master/README-DEVELOPER.md) and
[README-MAINTAINER](https://github.com/xpack/xpm-liquid-ts/blob/master/README-MAINTAINER.md)
pages.

## License

The original content is released under the
[MIT License](https://opensource.org/licenses/MIT), with all rights
reserved to [Liviu Ionescu](https://github.com/ilg-ul/).
