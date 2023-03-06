# src

This folder includes the main TypeScript source files, that provide
the project functionality.

They are compiled by `tsc` into the `cjs` folder as CommonJS code.

## CommonJS backward compatibility

Please note that the `package.json` defines the folder to
be an ES6 module, like the rest of the project, so all tests run
as ES6 modules, but the `tsconfig.json` defines
`"module": "commonjs"`, so the compiled files in the `cjs` folder
will be in CommonJS format.
