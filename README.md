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

TODO: add more info.

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
