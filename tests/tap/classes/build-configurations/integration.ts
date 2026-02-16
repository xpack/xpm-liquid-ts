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
// import * as path from 'node:path'
import assert, { AssertionError } from 'node:assert'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

// import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../common.js'

// ============================================================================

// const engine = new xpm.LiquidEngine()
// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await t.test(
  'BuildConfigurations - configurations',
  async (t): Promise<void> => {
    const json: xpm.JsonXpmPackage = {
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

    const xpmDataModel = new xpm.DataModel({
      log,
      jsonPackage: json,
    })

    const buildConfigurations = xpmDataModel.buildConfigurations
    t.ok(buildConfigurations, 'has buildConfigurations')

    // console.log(buildConfigurations.substitutionsVariables.properties)
    assert(json.xpack.properties, 'json.xpack.properties is defined')
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

    let isInitialised = await buildConfigurations.initialise()
    t.equal(isInitialised, true, 'buildConfigurations.initialise() => true')
    isInitialised = await buildConfigurations.initialise()
    t.equal(
      isInitialised,
      false,
      'buildConfigurations.initialise() again => false'
    )

    const buildConfigurationsNames = buildConfigurations.names
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

    t.equal(
      buildConfigurations.hasJson('alfa'),
      true,
      'hasJson("alfa") is true'
    )
    t.ok(buildConfigurations.getJson('alfa'), 'getJson("alfa")')
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

    const buildConfiguration = buildConfigurations.get('alfa')
    t.ok(buildConfiguration, 'buildConfigurationsNames.get("alfa")')

    t.equal(
      buildConfiguration.parentBuildConfigurations,
      buildConfigurations,
      'parentBuildConfigurations'
    )
    t.equal(
      buildConfiguration.buildConfigurationName,
      'alfa',
      'buildConfigurationName is "alfa"'
    )

    await buildConfiguration.initialise()

    // console.log(buildConfiguration.dependenciesMap)
    t.equal(
      Object.keys(buildConfiguration.dependencies).length,
      Object.keys(
        (
          json.xpack!.buildConfigurations!
            .alfa! as xpm.JsonBuildConfigurationContent
        ).dependencies!
      ).length,
      'dependencies length matches'
    )
    t.equal(
      buildConfiguration.dependencies['dep1'],
      '^1.0.0',
      'dependency dep1 matches'
    )
    // console.log(buildConfiguration.devDependenciesMap)
    t.equal(
      Object.keys(buildConfiguration.devDependencies).length,
      Object.keys(
        (
          json.xpack!.buildConfigurations!
            .alfa! as xpm.JsonBuildConfigurationContent
        ).devDependencies!
      ).length,
      'devDependencies length matches'
    )
    t.equal(
      buildConfiguration.devDependencies['ddep1'],
      '^10.0.0',
      'devDependency ddep1 matches'
    )

    const actions = buildConfiguration.actions
    t.ok(actions, 'has actions')

    isInitialised = await actions.initialise()
    t.equal(isInitialised, true, 'actions.initialise() => true')
    isInitialised = await actions.initialise()
    t.equal(isInitialised, false, 'actions.initialise() again => false')

    t.equal(actions.isEmpty, false, 'actions is not empty after init')

    const actionsNames = actions.names
    t.equal(actionsNames.length, 2, 'actions has 2 names')

    // -----

    t.equal(actionsNames[0], 'one', 'actions names[0] is "one"')
    t.ok(actions.has('one'), 'actions has action "one"')

    const actionOne = actions.get('one')
    t.ok(actionOne, 'actions.get("one")')

    t.equal(actionOne.parentActions, actions, 'parentActions')
    t.equal(actionOne.actionName, 'one', 'actionName is "one"')

    t.equal(
      actionOne.jsonAction,
      'echo {{ properties.p1 }} command',
      'jsonAction'
    )

    isInitialised = await actionOne.initialise()
    t.equal(isInitialised, true, 'actionOne.initialise() => true')

    let commands = actionOne.commands
    // console.log(commands)
    t.equal(commands.length, 1, 'actionOne has 1 command')
    t.equal(commands[0], 'echo 1 command', 'command is as expected')

    const actionTwo = actions.get('two')
    t.ok(actionTwo, 'actions.get("two")')

    isInitialised = await actionTwo.initialise()
    t.equal(isInitialised, true, 'actionTwo.initialise() => true')

    commands = actionTwo.commands
    t.equal(commands.length, 1, 'actionTwo has 1 command')
    t.equal(commands[0], 'echo 2a command', 'command is as expected')

    // -----
  }
)
