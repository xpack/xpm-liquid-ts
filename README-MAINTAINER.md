[![npm (scoped)](https://img.shields.io/npm/v/@xpack/xpm-liquid.svg)](https://www.npmjs.com/package/@xpack/xpm-liquid/)
[![license](https://img.shields.io/github/license/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/blob/xpack/LICENSE)
[![TS-Standard - Typescript Standard Style Guide](https://badgen.net/badge/code%20style/ts-standard/blue?icon=typescript)](https://github.com/standard/ts-standard/)
[![Actions Status](https://github.com/xpack/xpm-liquid-ts/workflows/CI%20on%20Push/badge.svg)](https://github.com/xpack/xpm-liquid-ts/actions/)
[![GitHub issues](https://img.shields.io/github/issues/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/issues/)
[![GitHub pulls](https://img.shields.io/github/issues-pr/xpack/xpm-liquid-ts.svg)](https://github.com/xpack/xpm-liquid-ts/pulls/)

# Maintainer info

This page complements the developer page and documents the
maintenance procedures related to making releases for the
`@xpack/xpm-liquid` module.

## Prepare the release

Before making the release, perform some checks and tweaks.

### Update npm packages

- `npm outdated`
- `npm update` or edit and `npm install`
- repeat and possibly manually edit `package.json` until everything is
  up to date

### Check Git

In this Git repo:

- in the `develop` branch
- push everything
- if needed, merge the `master` branch

### Determine the next version

Use the semantic versioning semantics.

### Fix possible open issues

Check GitHub issues and pull requests:

- in <https://github.com/xpack/xpm-liquid-ts/milestones>
add a new milestone like `1.1.0` (without `v`)
- <https://github.com/xpack/xpm-liquid-ts/issues/>

### Update versions in READMEs

- update version in `README.md` (if any)
- update version in `README-DEVELOPER.md`
- update version in `README-MAINTAINER.md`

## Update `CHANGELOG.md`

- check the latest commits `npm run git-log`
- open the `CHANGELOG.md` file
- check if all previous fixed issues are in
- commit with a message like _prepare v1.1.0_

## Publish to npmjs.com

- terminate all running tasks (**Terminal** → **Terminate Task...**)
- select the `develop` branch
- commit everything
- `npm run fix`
- in the develop branch, commit all changes
- `npm run test`
- `npm run pack`; check the list of packaged files, possibly
  update `.npmignore`
- `npm version patch` (bug fixes), `npm version minor` (compatible API
  additions), `npm version major` (incompatible API changes)
- push all changes to GitHub; this should trigger CI
- **wait for CI tests to complete**
- check <https://github.com/xpack/xpm-liquid-ts/actions/>
- `npm publish --tag next` (use `--access public` when publishing for the first time)

Check if the version is present at
[@xpack/xpm-liquid Versions](https://www.npmjs.com/package/@xpack/xpm-liquid?activeTab=versions).

### Test

Test it with:

```sh
npm install -global @xpack/xpm-liquid@next
```

### Change tag to latest

When stable:

- `npm dist-tag ls @xpack/xpm-liquid`
- `npm dist-tag add @xpack/xpm-liquid@1.1.0 latest`
- `npm dist-tag ls @xpack/xpm-liquid`

### Merge into `master`

In this Git repo:

- select the `master` branch
- merge `develop`
- push all branches
