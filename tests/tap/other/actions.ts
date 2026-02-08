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

// ----------------------------------------------------------------------------

// import * as os from 'node:os'
// import { fileURLToPath } from 'node:url'
// import * as path from 'node:path'

// https://www.npmjs.com/package/tap
import t from 'tap'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'

// ============================================================================

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)
// const fixturesFolderPath = path.join(path.dirname(__dirname), 'fixtures')

const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await t.test('actions', async (t): Promise<void> => {
  const json: xpm.json.XpmPackage = {
    name: 'test',
    version: '1.2.3',
    xpack: {
      properties: {
        p1: '1',
        p2: '{{ properties.p1 }}',
        p3: ['1', '2'],
        'build-types': ['debug', 'release'],
        builders: ['cmake', 'meson'],
        'actions-test-for-config':
          '{% for build-type in properties.build-types %}xpm run test ' +
          '--config {{ config }}-{{ build-type }}{{ os.EOL }}{% endfor %}',
      },
      actions: {
        one: 'echo {{ properties.p2 }} command',
        two: 'echo {{ properties.X }} command',
        three: [
          'line {{properties.p1 }}',
          'line 2{{os.EOL}}line 3{{os.EOL}}line {{ properties.p3 }}',
        ],
        'test-native-{{ matrix.builder }}-gcc{{ matrix.native-gcc-version }}': {
          matrix: {
            // builder: ['cmake', 'meson'],
            builder: [
              '{% for builder in properties.builders %}' +
                '{{ builder }}{{ os.EOL }}{% endfor %}',
            ],
            'native-gcc-version': ['', '15', '14'],
          },
          template: [
            "{% assign config = 'native-' | append: matrix.builder | " +
              "append: '-gcc' | append: matrix.native-gcc-version %}" +
              '{{ properties.actions-test-for-config }}',
          ],
        },
      },
    },
  }

  const xpmDataModel = new xpm.DataModel({
    log,
    jsonPackage: json,
  })

  const topActions = xpmDataModel.actions
  t.ok(topActions, 'has topActions')

  // console.log(topActions.substitutionsVariables.properties)
  t.equal(
    Object.keys(topActions.substitutionsVariables.properties).length,
    Object.keys(json.xpack.properties as xpm.json.Properties).length,
    'properties length matches'
  )

  t.equal(
    topActions.substitutionsVariables.properties.p1,
    '1',
    'properties.p1 is 1'
  )

  t.equal(topActions.isEmpty, true, 'topActions is empty')
  let actionsNames = topActions.names
  t.ok(Array.isArray(actionsNames), 'topActions.names is array')
  t.equal(actionsNames.length, 0, 'topActions has 0 names')

  let initialised = await topActions.initialise()
  t.equal(initialised, true, 'topActions.initialise() => true')
  initialised = await topActions.initialise()
  t.equal(initialised, false, 'topActions.initialise() again => false')

  t.equal(topActions.isEmpty, false, 'topActions is not empty after init')

  actionsNames = topActions.names
  t.equal(actionsNames.length, 3 + 6, 'topActions has 9 names')

  // -----
  t.equal(actionsNames[0], 'one', 'topActions names[0] is "one"')
  t.ok(topActions.has('one'), 'topActions has action "one"')

  const actionOne = topActions.get('one')
  t.ok(actionOne, 'topActions.get("one")')

  t.equal(actionOne.parentActions, topActions, 'parentActions')
  t.equal(actionOne.actionName, 'one', 'actionName is "one"')

  t.equal(
    actionOne.jsonAction,
    'echo {{ properties.p2 }} command',
    'jsonAction'
  )
  // t.equal(
  //   actionOne.#matrixParameters,
  //   undefined,
  //   'matrixParameters is undefined'
  // )

  initialised = await actionOne.initialise()
  t.equal(initialised, true, 'actionOne.initialise() again => true')

  let commands = actionOne.commands
  // console.log(commands)
  t.equal(commands.length, 1, 'actionOne has 1 command')
  t.equal(commands[0], 'echo 1 command', 'command is as expected')

  // -----

  t.equal(actionsNames[1], 'two', 'topActions names[1] is "two"')
  t.ok(topActions.has('two'), 'topActions has action "two"')

  const actionTwo = topActions.get('two')
  t.ok(actionTwo, 'topActions.get("two")')

  try {
    await actionTwo.initialise()
    t.fail('topActions.get("two") should have failed')
  } catch (err) {
    t.pass('actionTwo initialisation failed as expected')
  }

  // -----

  t.equal(actionsNames[2], 'three', 'topActions names[2] is "three"')
  t.ok(topActions.has('three'), 'topActions has action "three"')

  const actionThree = topActions.get('three')
  t.ok(actionThree, 'topActions.get("three")')

  await actionThree.initialise()
  commands = actionThree.commands
  // console.log(commands)
  t.equal(commands.length, 4, 'actionThree has 4 commands')
  t.equal(commands[0], 'line 1', 'command line 1 is as expected')
  t.equal(commands[1], 'line 2', 'command line 2 is as expected')
  t.equal(commands[2], 'line 3', 'command line 3 is as expected')
  t.equal(commands[3], 'line 12', 'command line 4 is as expected')

  // -----

  t.equal(
    actionsNames[3],
    'test-native-cmake-gcc',
    'topActions names[3] is "test-native-cmake-gcc"'
  )
  t.ok(
    topActions.has('test-native-cmake-gcc'),
    'topActions has action "test-native-cmake-gcc"'
  )

  let actionTemplate = topActions.get('test-native-cmake-gcc')
  t.ok(actionTemplate, 'topActions.get("test-native-cmake-gcc")')

  // console.log(actionTemplate.jsonAction)
  await actionTemplate.initialise()
  commands = actionTemplate.commands
  // console.log(commands)
  t.equal(commands.length, 2, 'actionTemplate has 2 commands')
  t.equal(
    commands[0],
    'xpm run test --config native-cmake-gcc-debug',
    'command line 1 is as expected'
  )
  t.equal(
    commands[1],
    'xpm run test --config native-cmake-gcc-release',
    'command line 2 is as expected'
  )

  // -----

  t.equal(
    actionsNames[8],
    'test-native-meson-gcc14',
    'topActions names[8] is "test-native-meson-gcc14"'
  )
  t.ok(
    topActions.has('test-native-meson-gcc14'),
    'topActions has action "test-native-meson-gcc14"'
  )

  actionTemplate = topActions.get('test-native-meson-gcc14')
  t.ok(actionTemplate, 'topActions.get("test-native-meson-gcc14")')

  // console.log(actionTemplate.jsonAction)
  await actionTemplate.initialise()
  commands = actionTemplate.commands
  // console.log(commands)
  t.equal(commands.length, 2, 'actionTemplate has 2 commands')
  t.equal(
    commands[0],
    'xpm run test --config native-meson-gcc14-debug',
    'command line 1 is as expected'
  )
  t.equal(
    commands[1],
    'xpm run test --config native-meson-gcc14-release',
    'command line 2 is as expected'
  )

  // -----

  t.end()
})

// ----------------------------------------------------------------------------
