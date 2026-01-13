/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

// import * as os from 'node:os'
// import { fileURLToPath } from 'node:url'
// import * as path from 'node:path'
import * as util from 'node:util'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'

// ----------------------------------------------------------------------------

import { JsonXpmPackage, XpmLiquidPackage } from '../../src/index.js'
import { Logger } from '@xpack/logger'

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)
// const fixturesFolderPath = path.join(path.dirname(__dirname), 'fixtures')

const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await test('configurations', async (t): Promise<void> => {
  const json: JsonXpmPackage = {
    name: 'test',
    version: '1.2.3',
    xpack: {
      properties: {
        p1: '1',
        p2: '2',
      },
      buildConfigurations: {
        alfa: {
          dependencies: {
            dep1: '^1.0.0',
            dep2: { specifier: '^2.0.0', local: 'link' },
          },
          devDependencies: {
            ddep1: '^10.0.0',
            ddep2: { specifier: '^20.0.0', local: 'copy', platforms: 'any' },
          },
          properties: { p2: '2a' },
          actions: {
            one: 'echo {{ properties.p1 }} command',
            two: 'echo {{ properties.p2 }} command',
          },
        },
      },
    },
  }

  const xpmLiquidPackage = new XpmLiquidPackage({
    log,
    jsonPackage: json,
  })

  const buildConfigurations = xpmLiquidPackage.buildConfigurations
  t.ok(buildConfigurations, 'has buildConfigurations')

  // console.log(buildConfigurations.substitutionsVariables.properties)
  t.equal(
    Object.keys(buildConfigurations.substitutionsVariables.properties).length,
    Object.keys(json.xpack.properties).length,
    'properties length matches'
  )

  t.equal(
    buildConfigurations.substitutionsVariables.properties.p1,
    '1',
    'properties.p1 is 1'
  )

  // -----

  t.equal(buildConfigurations.empty(), true, 'buildConfigurations is empty')

  let buildConfigurationsNames = buildConfigurations.names()
  t.ok(
    Array.isArray(buildConfigurationsNames),
    'buildConfigurations.names() is array'
  )
  t.equal(buildConfigurationsNames.length, 0, 'buildConfigurations has 0 names')

  let initialised = await buildConfigurations.initialise()
  t.equal(initialised, true, 'buildConfigurations.initialise() => true')
  initialised = await buildConfigurations.initialise()
  t.equal(initialised, false, 'buildConfigurations.initialise() again => false')

  buildConfigurationsNames = buildConfigurations.names()
  t.equal(
    buildConfigurationsNames.length,
    Object.keys(json.xpack!.buildConfigurations!).length,
    'buildConfigurations has' + buildConfigurationsNames.length + 'names'
  )

  // -----

  t.equal(
    buildConfigurationsNames[0],
    'alfa',
    'buildConfigurations names[0] is "alfa"'
  )

  t.equal(buildConfigurations.hasJson('alfa'), true, 'hasJson("alfa") is true')
  t.ok(buildConfigurations.getJson('alfa'), 'getJson("alfa") is ok')
  t.equal(
    buildConfigurations.getJsonName('alfa'),
    'alfa',
    'getJsonName("alfa") is "alfa"'
  )

  t.equal(
    buildConfigurations.isHidden('alfa'),
    false,
    'isHidden("alfa") is false'
  )

  t.ok(
    buildConfigurations.has('alfa'),
    'buildConfigurations has configuration "alfa"'
  )

  let buildConfiguration = await buildConfigurations.get('alfa')
  t.ok(buildConfiguration, 'buildConfigurationsNames.get("alfa") is ok')

  t.equal(
    buildConfiguration.parentBuildConfigurations,
    buildConfigurations,
    'parentBuildConfigurations is ok'
  )
  t.equal(
    buildConfiguration.buildConfigurationName,
    'alfa',
    'buildConfigurationName is "alfa"'
  )

  // console.log(buildConfiguration.dependenciesMap)
  t.equal(
    buildConfiguration.dependenciesMap.size,
    Object.keys(json.xpack!.buildConfigurations!.alfa!.dependencies!).length,
    'dependencies length matches'
  )
  t.equal(
    buildConfiguration.dependenciesMap.get('dep1'),
    '^1.0.0',
    'dependency dep1 matches'
  )
  // console.log(buildConfiguration.devDependenciesMap)
  t.equal(
    buildConfiguration.devDependenciesMap.size,
    Object.keys(json.xpack!.buildConfigurations!.alfa!.devDependencies!).length,
    'devDependencies length matches'
  )
  t.equal(
    buildConfiguration.devDependenciesMap.get('ddep1'),
    '^10.0.0',
    'devDependency ddep1 matches'
  )

  const actions = buildConfiguration.actions
  t.ok(actions, 'has actions')

  t.equal(actions.empty(), true, 'actions is empty')
  let actionsNames = actions.names()
  t.ok(Array.isArray(actionsNames), 'actions.names() is array')
  t.equal(actionsNames.length, 0, 'actions has 0 names')

  let actionsInitialised = await actions.initialise()
  t.equal(actionsInitialised, true, 'actions.initialise() => true')
  actionsInitialised = await actions.initialise()
  t.equal(actionsInitialised, false, 'actions.initialise() again => false')

  t.equal(actions.empty(), false, 'actions is not empty after init')

  actionsNames = actions.names()
  t.equal(actionsNames.length, 2, 'actions has 2 names')

  // -----

  t.equal(actionsNames[0], 'one', 'actions names[0] is "one"')
  t.ok(actions.has('one'), 'actions has action "one"')

  const actionOne = await actions.get('one')
  t.ok(actionOne, 'actions.get("one") is ok')

  t.equal(actionOne.parentActions, actions, 'parentActions is ok')
  t.equal(actionOne.actionName, 'one', 'actionName is "one"')

  t.equal(
    actionOne.jsonAction,
    'echo {{ properties.p1 }} command',
    'jsonAction is ok'
  )

  initialised = await actionOne.initialise()
  t.equal(initialised, false, 'actionOne.initialise() again => false')

  let commands = actionOne.commands
  // console.log(commands)
  t.equal(commands.length, 1, 'actionOne has 1 command')
  t.equal(commands[0], 'echo 1 command', 'command is as expected')

  const actionTwo = await actions.get('two')
  t.ok(actionTwo, 'actions.get("two") is ok')

  await actionTwo.initialise()
  commands = actionTwo.commands
  t.equal(commands.length, 1, 'actionTwo has 1 command')
  t.equal(commands[0], 'echo 2a command', 'command is as expected')

  // -----

  t.end()
})

await test('configurations inheritance', async (t): Promise<void> => {
  const json: JsonXpmPackage = {
    name: 'test',
    version: '1.2.3',
    xpack: {
      properties: {
        buildFolderRelativePath:
          "{{ 'build' | path_join: configuration.name | to_filename | downcase }}",
        buildFolderRelativePathPosix:
          "{{ 'build' | path_posix_join: configuration.name | downcase }}",
        commandCMakePrepare:
          '{{ properties.commandCMakeReconfigure }} --log-level=VERBOSE',
        commandCMakePrepareWithToolchain:
          '{{ properties.commandCMakePrepare }} -D CMAKE_TOOLCHAIN_FILE=xpacks/@micro-os-plus/build-helper/cmake/toolchains/{{ properties.toolchainFileName }}',
        commandCMakeReconfigure:
          "cmake -S . -B {{ properties.buildFolderRelativePathPosix }} -G Ninja{% if os.platform == 'win32' %} -D CMAKE_MAKE_PROGRAM=ninja.cmd{% endif %} -D CMAKE_BUILD_TYPE={{ properties.buildType }} -D PLATFORM_NAME={{ properties.platformName }} -D CMAKE_EXPORT_COMPILE_COMMANDS=ON",
        commandCMakeBuild:
          'cmake --build {{ properties.buildFolderRelativePathPosix }}',
        commandCMakeBuildVerbose:
          'cmake --build {{ properties.buildFolderRelativePathPosix }} --verbose',
        commandCMakeClean:
          'cmake --build {{ properties.buildFolderRelativePathPosix }} --target clean',
        commandCMakePerformTests:
          'cd {{ properties.buildFolderRelativePath }} && ctest -V',
      },
      buildConfigurations: {
        'cmake-actions': {
          hidden: true,
          actions: {
            prepare: '{{ properties.commandCMakePrepareWithToolchain }}',
            build: [
              '{{ properties.commandCMakeReconfigure }}',
              '{{ properties.commandCMakeBuild }}',
            ],
            test: '{{ properties.commandCMakePerformTests }}',
            clean: '{{ properties.commandCMakeClean }}',
          },
        },
        'native-dependencies': {
          hidden: true,
          devDependencies: {
            '@micro-os-plus/architecture-synthetic-posix': '4.0.3',
          },
        },
        'native-actions': {
          hidden: true,
          actions: {
            install: ['xpm install --config {{ configuration.name }}'],
            'link-deps': [
              'xpm link --config {{ configuration.name }} @micro-os-plus/architecture-synthetic-posix',
            ],
          },
        },
        'gcc14-dependencies': {
          hidden: true,
          $devDependenciesUrl:
            'https://www.npmjs.com/package/@xpack-dev-tools/gcc',
          devDependencies: {
            '@xpack-dev-tools/gcc': {
              specifier: '14.2.0-2.1',
              platforms: 'linux-x64,linux-arm64,win32-x64',
            },
          },
        },
        'native-cmake-gcc': {
          hidden: true,
          inherits: ['cmake-actions', 'native-actions', 'native-dependencies'],
          properties: {
            buildType: 'Debug',
            platformName: 'native',
            toolchainFileName: 'gcc.cmake',
          },
        },
        'native-cmake-gcc14-debug': {
          inherits: ['native-cmake-gcc', 'gcc14-dependencies'],
        },
        'native-cmake-gcc14-release': {
          inherits: ['native-cmake-gcc14-debug'],
          properties: {
            buildType: 'Release',
          },
        },
      },
    },
  }

  const xpmLiquidPackage = new XpmLiquidPackage({
    log,
    jsonPackage: json,
  })

  const buildConfigurations = xpmLiquidPackage.buildConfigurations
  t.ok(buildConfigurations, 'has buildConfigurations')

  let initialised = await buildConfigurations.initialise()
  t.equal(initialised, true, 'buildConfigurations.initialise() => true')

  const buildConfigurationsNames = buildConfigurations.names()
  t.equal(
    buildConfigurationsNames.length,
    Object.keys(json.xpack!.buildConfigurations!).length,
    'buildConfigurations has ' + buildConfigurationsNames.length + ' names'
  )

  t.ok(
    buildConfigurations.has('native-cmake-gcc14-release'),
    'buildConfigurations has configuration "native-cmake-gcc14-release"'
  )

  // log.level = 'trace'
  let buildConfiguration = await buildConfigurations.get(
    'native-cmake-gcc14-release'
  )
  // log.level = 'info'
  t.ok(
    buildConfiguration,
    'buildConfigurationsNames.get("native-cmake-gcc14-release") is ok'
  )

  t.equal(
    Object.keys(buildConfiguration.properties).length,
    3,
    'buildConfiguration.properties length is 3'
  )
  t.equal(
    buildConfiguration.properties.buildType,
    'Release',
    'buildConfiguration.properties.buildType is ok'
  )
  t.equal(
    buildConfiguration.properties.platformName,
    'native',
    'buildConfiguration.properties.platformName is ok'
  )
  t.equal(
    buildConfiguration.properties.toolchainFileName,
    'gcc.cmake',
    'buildConfiguration.properties.toolchainFileName is ok'
  )

  t.equal(
    buildConfiguration.devDependenciesMap.size,
    2,
    'devDependencies length matches'
  )

  t.equal(
    buildConfiguration.devDependenciesMap.has('@xpack-dev-tools/gcc'),
    true,
    'has devDependency @xpack-dev-tools/gcc'
  )
  t.equal(
    buildConfiguration.devDependenciesMap.has(
      '@micro-os-plus/architecture-synthetic-posix'
    ),
    true,
    'has devDependency @micro-os-plus/architecture-synthetic-posix'
  )

  const actions = buildConfiguration.actions
  t.ok(actions, 'has actions')

  let actionsInitialised = await actions.initialise()
  t.equal(actionsInitialised, true, 'actions.initialise() => true')

  const actionsNames = actions.names()
  // console.log(actionsNames)
  t.equal(
    actionsNames.length,
    6,
    'actions has ' + actionsNames.length + ' names'
  )

  const action = await actions.get('build')
  t.ok(action, 'actions.get("build") is ok')

  await action.initialise()
  const commands = action.commands
  t.equal(commands.length, 2, 'action "build" has 2 commands')
  t.equal(
    commands[0],
    'cmake -S . -B build/native-cmake-gcc14-release -G Ninja' +
      ' -D CMAKE_BUILD_TYPE=Release' +
      ' -D PLATFORM_NAME=native' +
      ' -D CMAKE_EXPORT_COMPILE_COMMANDS=ON',
    'first command is cmake -S . -B ...'
  )
  t.equal(
    commands[1],
    'cmake --build build/native-cmake-gcc14-release',
    'second command is cmake --build'
  )

  // -----

  t.end()
})

await test('configurations template', async (t): Promise<void> => {
  const json: JsonXpmPackage = {
    name: 'test',
    version: '1.2.3',
    xpack: {
      properties: {
        dummyMap: {
          one: '11',
          two: '22',
          three: '33',
        },
        builders: ['cmake', 'meson'],
        'native-gcc-releases': {
          '15': {
            specifier: '15.2.0-1.1',
            platforms: 'linux-x64,linux-arm64,win32-x64',
          },
          '14': {
            specifier: '14.3.0-1.1',
            platforms: 'linux-x64,linux-arm64,win32-x64',
          },
        },
        'native-gcc-versions': [
          '{{ properties.native-gcc-releases | keys | join_lines }}',
        ],
      },
      actions: {
        dummy: '{{ properties.dummyMap["one"] }}',
      },
      buildConfigurations: {
        alfa: {},
        'native-gcc{{ matrix.native-gcc-version}}-dependencies': {
          matrix: {
            'native-gcc-version': [
              '',
              '{{ properties.native-gcc-versions | join_lines }}',
            ],
          },
          template: {
            hidden: true,
            devDependencies: {
              '@xpack-dev-tools/gcc': {
                specifier:
                  '{{ properties.native-gcc-releases[matrix.native-gcc-version].specifier }}',
                platforms:
                  '{{ properties.native-gcc-releases[matrix.native-gcc-version].platforms }}',
              },
            },
          },
        },
        'native-actions': {
          hidden: true,
          actions: {
            install: ['xpm install --config {{ configuration.name }}'],
            'link-dependencies': [
              'xpm link --config {{ configuration.name }} @micro-os-plus/architecture-synthetic-posix',
            ],
          },
        },
        'native-dependencies': {
          hidden: true,
          devDependencies: {
            '@micro-os-plus/architecture-synthetic-posix': '4.0.3',
          },
        },
        'cmake-actions': {
          hidden: true,
          actions: {
            prepare: '{{ properties.commandCMakePrepareWithToolchain }}',
            build: [
              '{{ properties.commandCMakeReconfigure }}',
              '{{ properties.commandCMakeBuild }}',
            ],
            test: '{{ properties.commandCMakePerformTests }}',
            clean: '{{ properties.commandCMakeClean }}',
          },
        },
        'native-cmake-gcc': {
          hidden: true,
          inherits: ['cmake-actions', 'native-actions', 'native-dependencies'],
          properties: {
            buildType: 'Debug',
            platformName: 'native',
            toolchainFileName: 'gcc.cmake',
          },
        },
        'native-meson-gcc': {
          hidden: true,
          inherits: [
            'native-actions',
            'meson-native-actions',
            'native-dependencies',
          ],
          properties: {
            buildType: 'debug',
            platformName: 'native',
            toolchainFileName: 'gcc-{{ os.platform }}.ini',
          },
        },
        'meson-native-actions': {
          hidden: true,
          actions: {
            prepare: '{{ properties.commandMesonPrepareWithToolchain }}',
            build: [
              '{{ properties.commandMesonReconfigure }}',
              '{{ properties.commandMesonBuild }}',
            ],
            test: '{{ properties.commandMesonPerformTests }}',
            clean: '{{ properties.commandMesonClean }}',
          },
        },
        'native-{{ matrix.builder }}-gcc{{ matrix.native-gcc-version }}-debug':
          {
            matrix: {
              builder: ['{{ properties.builders | join_lines }}'],
              'native-gcc-version': [
                '',
                '{{ properties.native-gcc-versions | join_lines }}',
              ],
            },
            template: {
              inherits: [
                'native-{{ matrix.builder }}-gcc',
                'native-gcc{{ matrix.native-gcc-version }}-dependencies',
              ],
            },
          },
        'native-{{ matrix.builder }}-gcc{{ matrix.native-gcc-version }}-release':
          {
            matrix: {
              builder: ['{{ properties.builders | join_lines }}'],
              'native-gcc-version': [
                '',
                '{{ properties.native-gcc-versions | join_lines }}',
              ],
            },
            template: {
              inherits: [
                'native-{{ matrix.builder }}-gcc{{ matrix.native-gcc-version }}-debug',
              ],
              properties: {
                buildType:
                  "{% case matrix.builder %}{% when 'cmake' %}Release{% when 'meson' %}release{% else %}unknown{% endcase %}",
              },
            },
          },
        bravo: {},
      },
    },
  }

  // log.level = 'trace'
  const xpmLiquidPackage = new XpmLiquidPackage({
    log,
    jsonPackage: json,
  })

  // -----

  let actions = xpmLiquidPackage.actions
  t.ok(actions, 'has actions')

  let actionsInitialised = await actions.initialise()
  t.equal(actionsInitialised, true, 'actions.initialise() => true')

  let actionsNames = actions.names()
  t.equal(
    actionsNames.length,
    1,
    'actions has ' + actionsNames.length + ' names'
  )

  const action = await actions.get('dummy')
  t.ok(action, 'actions.get("dummy") is ok')

  await action.initialise()
  const commands = action.commands
  t.equal(commands.length, 1, 'action "dummy" has 1 command')
  t.equal(commands[0], '11', 'command is as expected')

  // -----

  const buildConfigurations = xpmLiquidPackage.buildConfigurations
  t.ok(buildConfigurations, 'has buildConfigurations')

  // -----
  let initialised = await buildConfigurations.initialise()
  t.equal(initialised, true, 'buildConfigurations.initialise() => true')

  const buildConfigurationsNames = buildConfigurations.names()
  // console.log(buildConfigurationsNames)
  t.equal(
    buildConfigurationsNames.length,
    23,
    'buildConfigurations has ' + 23 + ' names'
  )

  t.equal(
    buildConfigurationsNames[0],
    'alfa',
    'buildConfigurations names[0] is "alfa"'
  )
  t.equal(
    buildConfigurationsNames[2],
    'native-gcc14-dependencies',
    'buildConfigurations names[2] is "native-gcc14-dependencies"'
  )
  t.equal(
    buildConfigurationsNames[3],
    'native-gcc15-dependencies',
    'buildConfigurations names[3] is "native-gcc15-dependencies"'
  )
  t.equal(
    buildConfigurationsNames[11],
    'native-cmake-gcc14-debug',
    'buildConfigurations names[11] is "native-cmake-gcc14-debug"'
  )
  t.equal(
    buildConfigurationsNames[21],
    'native-meson-gcc15-release',
    'buildConfigurations names[21] is "native-meson-gcc15-release"'
  )
  t.equal(
    buildConfigurationsNames[22],
    'bravo',
    'buildConfigurations names[22] is "bravo"'
  )

  let buildConfiguration = await buildConfigurations.get(
    'native-gcc15-dependencies'
  )
  t.ok(
    buildConfiguration,
    'buildConfigurationsNames.get("native-gcc15-dependencies") is ok'
  )

  await buildConfiguration.initialise()
  const devDepGcc = buildConfiguration.devDependencies
  t.equal(
    devDepGcc['@xpack-dev-tools/gcc'].specifier,
    '15.2.0-1.1',
    'gcc specifier is "15.2.0-1.1"'
  )
  t.equal(
    devDepGcc['@xpack-dev-tools/gcc'].platforms,
    'linux-x64,linux-arm64,win32-x64',
    'gcc platforms is "linux-x64,linux-arm64,win32-x64"'
  )

  // -----

  buildConfiguration = await buildConfigurations.get(
    'native-cmake-gcc15-release'
  )
  t.ok(
    buildConfiguration,
    'buildConfigurationsNames.get("native-cmake-gcc15-release") is ok'
  )

  await buildConfiguration.initialise()

  actions = buildConfiguration.actions
  t.ok(actions, 'has actions')

  actionsInitialised = await actions.initialise()
  t.equal(actionsInitialised, true, 'actions.initialise() => true')

  actionsNames = actions.names()
  // console.log(actionsNames)
  t.equal(actionsNames.length, 6, 'actions has ' + 6 + ' names')

  let devDependencies = buildConfiguration.devDependencies
  t.equal(
    devDependencies['@xpack-dev-tools/gcc'].specifier,
    '15.2.0-1.1',
    'gcc specifier is "15.2.0-1.1"'
  )
  t.equal(
    devDependencies['@xpack-dev-tools/gcc'].platforms,
    'linux-x64,linux-arm64,win32-x64',
    'gcc platforms is "linux-x64,linux-arm64,win32-x64"'
  )
  t.equal(
    devDependencies['@micro-os-plus/architecture-synthetic-posix'],
    '4.0.3',
    'architecture-synthetic-posix specifier is "4.0.3"'
  )

  // -----

  t.end()
})

// ----------------------------------------------------------------------------
