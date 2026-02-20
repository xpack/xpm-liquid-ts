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

import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import { AssertionError } from 'node:assert'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'

// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mockProcess: NodeJS.Process = {
  env: {},
} as unknown as NodeJS.Process

const mockContext: xpm.Context = {
  log: new Logger({ level: 'info' }),
  config: {
    projectName: 'test-project',
    properties: {
      stringProp: 'a string',
    },
    cwd: process.cwd(),
  },
}

const propertiesDefinitions: xpm.InitTemplatePropertiesDefinitions = {
  stringProp: {
    label: 'String Property',
    description: 'A string property for testing',
    type: 'string',
    default: 'defaultString',
  },
}

class XpmInitTemplate extends xpm.InitTemplateBase {
  async generate(): Promise<void> {}
}

// ----------------------------------------------------------------------------

t.test('InitTemplateBase - constructor assertions', (t): void => {
  let template

  class XpmInitTemplate extends xpm.InitTemplateBase {
    async generate(): Promise<void> {
      t.fail('generate() should not be called')
    }
  }

  try {
    template = new XpmInitTemplate({
      context: undefined as unknown as xpm.Context,
      __dirname: '/my/dir',
      templatesPath: '/my/templates',
      propertiesDefinitions: {},
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(error, AssertionError, 'threw an error for missing context')
  }

  try {
    template = new XpmInitTemplate({
      context: {} as xpm.Context,
      __dirname: '/my/dir',
      templatesPath: '/my/templates',
      propertiesDefinitions: {},
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(error, AssertionError, 'threw an error for missing context.log')
  }

  try {
    template = new XpmInitTemplate({
      context: { log: new Logger({ level: 'info' }) } as xpm.Context,
      __dirname: '/my/dir',
      templatesPath: '/my/templates',
      propertiesDefinitions: {},
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(error, AssertionError, 'threw an error for missing context.config')
  }

  try {
    template = new XpmInitTemplate({
      context: {
        log: new Logger({ level: 'info' }),
        config: { cwd: process.cwd() },
      },
      __dirname: '/my/dir',
      templatesPath: '/my/templates',
      propertiesDefinitions: {},
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(
      error,
      AssertionError,
      'threw an error for missing context.config.projectName'
    )
  }

  try {
    template = new XpmInitTemplate({
      context: {
        log: new Logger({ level: 'info' }),
        config: {
          projectName: 'test-project',
          cwd: '/my/cwd',
        },
      },
      __dirname: '/my/dir',
      templatesPath: '/my/templates',
      propertiesDefinitions: {},
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(
      error,
      AssertionError,
      'threw an error for missing context.config.properties'
    )
  }

  try {
    template = new XpmInitTemplate({
      context: mockContext,
      __dirname: undefined as unknown as string,
      templatesPath: '/my/templates',
      propertiesDefinitions: {},
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(error, AssertionError, 'threw an error for missing __dirname')
  }

  try {
    template = new XpmInitTemplate({
      context: mockContext,
      __dirname: '/my/dir',
      templatesPath: undefined as unknown as string,
      propertiesDefinitions: {},
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(error, AssertionError, 'threw an error for missing templatesPath')
  }

  try {
    template = new XpmInitTemplate({
      context: mockContext,
      __dirname: '/my/dir',
      templatesPath: '/my/templates',
      propertiesDefinitions:
        undefined as unknown as xpm.InitTemplatePropertiesDefinitions,
      process: mockProcess,
    })
    t.fail('should have thrown for missing context')
  } catch (error) {
    t.type(
      error,
      AssertionError,
      'threw an error for missing propertiesDefinitions'
    )
  }

  t.end()
})

await t.test(
  'InitTemplateBase - empty configuration',
  async (t): Promise<void> => {
    class XpmInitTemplate extends xpm.InitTemplateBase {
      async generate(): Promise<void> {
        t.ok(true, 'generate() called')

        t.same(this.context, mockContext, 'context is correct')
        t.equal(this.__dirname, '/my/dir', '__dirname is correct')
        t.equal(this.templatesPath, '/my/templates', 'templatesPath is correct')
        t.same(this.process, mockProcess, 'process is correct')

        t.equal(
          this.substitutionsVariables?.projectName,
          'test-project',
          'substitutionsVariables.projectName is correct'
        )
        t.equal(
          this.substitutionsVariables?.year,
          new Date().getFullYear().toString(),
          'substitutionsVariables.year is correct'
        )
        t.equal(
          this.substitutionsVariables?.stringProp,
          'a string',
          'substitutionsVariables.stringProp is correct'
        )
        t.equal(
          this.substitutionsVariables?.properties.stringProp,
          'a string',
          'substitutionsVariables.properties.stringProp is correct'
        )
      }
    }

    const template = new XpmInitTemplate({
      context: mockContext,
      __dirname: '/my/dir',
      templatesPath: '/my/templates',
      propertiesDefinitions,
      process: mockProcess,
    })

    const exitCode = await template.run()
    t.equal(exitCode, 0, 'exit code is 0')
  }
)

await t.test('InitTemplateBase - default process', async (t): Promise<void> => {
  class XpmInitTemplate extends xpm.InitTemplateBase {
    async generate(): Promise<void> {
      t.ok(true, 'generate() called')

      t.same(this.process, process, 'process is default')
    }
  }

  const propertiesDefinitions: xpm.InitTemplatePropertiesDefinitions = {
    stringProp: {
      label: 'String Property',
      description: 'A string property for testing',
      type: 'string',
      items: {},
      isMandatory: false,
      default: 'defaultString',
    },
  }

  const template = new XpmInitTemplate({
    context: mockContext,
    __dirname: '/my/dir',
    templatesPath: '/my/templates',
    propertiesDefinitions,
  })

  const exitCode = await template.run()
  t.equal(exitCode, 0, 'exit code is 0')
})

// ----------------------------------------------------------------------------
