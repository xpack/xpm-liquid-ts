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

import * as os from 'node:os'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import {
  isBoolean,
  isNumber,
  isString,
  XpmContext,
  XpmInitTemplateBase,
  XpmInitTemplateItems,
  XpmInitTemplatePropertiesDefinition,
  XpmInitTemplatePropertiesDefinitions,
  XpmInitTemplateType,
  XpmOutputError,
  XpmSyntaxError,
} from '../../../src/index.js'
import { AssertionError } from 'node:assert'

// ----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesFolderPath = path.join(
  path.dirname(path.dirname(__dirname)),
  'fixtures'
)

const mockProcess: NodeJS.Process = {
  env: {},
} as unknown as NodeJS.Process

const mockContext: XpmContext = {
  log: new Logger({ level: 'info' }),
  config: {
    projectName: 'test-project',
    properties: {},
    cwd: process.cwd(),
  },
}

const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
  stringProp: {
    label: 'String Property',
    description: 'A string property for testing',
    type: 'string',
    default: 'defaultString',
  },
}

class XpmInitTemplate extends XpmInitTemplateBase {
  async generate(): Promise<void> {}
}

// ----------------------------------------------------------------------------

await t.test('XpmInitTemplateBase asserts', async (t): Promise<void> => {
  let template

  class XpmInitTemplate extends XpmInitTemplateBase {
    async generate(): Promise<void> {
      t.fail('generate() should not be called')
    }
  }

  try {
    template = new XpmInitTemplate({
      context: undefined as unknown as XpmContext,
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
      context: {} as XpmContext,
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
      context: { log: new Logger({ level: 'info' }) } as XpmContext,
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
        undefined as unknown as XpmInitTemplatePropertiesDefinitions,
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

await t.test('XpmInitTemplateBase empty', async (t): Promise<void> => {
  class XpmInitTemplate extends XpmInitTemplateBase {
    async generate(): Promise<void> {
      t.ok(true, 'generate() called')

      t.same(this._context, mockContext, 'context is correct')
      t.equal(this.__dirname, '/my/dir', '__dirname is correct')
      t.equal(this._templatesPath, '/my/templates', 'templatesPath is correct')
      t.same(this._process, mockProcess, 'process is correct')

      t.equal(
        this._substitutionsVariables?.projectName,
        'test-project',
        'substitutionsVariables.projectName is correct'
      )
      t.equal(
        this._substitutionsVariables?.year,
        new Date().getFullYear().toString(),
        'substitutionsVariables.year is correct'
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

  t.end()
})

await t.test(
  'XpmInitTemplateBase default process',
  async (t): Promise<void> => {
    class XpmInitTemplate extends XpmInitTemplateBase {
      async generate(): Promise<void> {
        t.ok(true, 'generate() called')

        t.same(this._process, process, 'process is default')
      }
    }

    const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
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

    t.end()
  }
)

await t.test(
  'XpmInitTemplateBase._validatePropertyValue()',
  async (t): Promise<void> => {
    const mockProcess: NodeJS.Process = {
      env: {},
      platform: 'linux',
      arch: 'x64',
    } as unknown as NodeJS.Process

    const mockContext: XpmContext = {
      log: new Logger({ level: 'info' }),
      config: {
        projectName: 'test-project',
        properties: {
          stringProp: 'a string',
          numberProp: '43',
          booleanProp: 'true',
          booleanPropTrue: 'false',
          selectProp: 'option2',
          selectPropPlatform: 'option2',
        },
        cwd: process.cwd(),
      },
    }

    const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
      stringProp: {
        label: 'String Property',
        description: 'A string property for testing',
        type: 'string',
        items: {},
        isMandatory: false,
        default: 'defaultString',
      },
      stringPropNoDefault: {
        label: 'String Property Without Default',
        description: 'A string property for testing',
        type: 'string',
        items: {},
        isMandatory: false,
      },
      numberProp: {
        label: 'Number Property',
        description: 'A number property for testing',
        type: 'number',
        items: {},
        isMandatory: false,
        default: 42,
      },
      booleanProp: {
        label: 'Boolean Property',
        description: 'A boolean property for testing',
        type: 'boolean',
        items: {},
        isMandatory: false,
        default: false,
      },
      booleanPropTrue: {
        label: 'Boolean Property',
        description: 'A boolean property for testing',
        type: 'boolean',
        items: {},
        isMandatory: false,
        default: true,
      },
      selectProp: {
        label: 'Select Property',
        description: 'A select property for testing',
        type: 'select',
        items: {
          option1: 'Option 1',
          option2: 'Option 2',
        },
        isMandatory: false,
        default: 'option1',
      },
      selectPropPlatform: {
        label: 'Select Property',
        description: 'A select property for testing',
        type: 'select',
        items: {
          option1: {
            platforms: ['linux', 'win32'],
            message: 'Option 1',
          },
          option2: {
            platforms: ['linux', 'win32'],
            message: 'Option 2',
          },
          option3: {
            platforms: ['darwin', 'win32'],
            message: 'Option 3',
          },
        },
        isMandatory: false,
        default: 'option1',
      },
    }

    class XpmInitTemplate extends XpmInitTemplateBase {
      async generate(): Promise<void> {
        t.ok(true, 'generate() called')

        const config = this._context.config

        t.equal(
          isString(config.properties!.stringProp),
          true,
          'stringProp is string'
        )
        t.equal(
          isNumber(config.properties!.numberProp),
          true,
          'numberProp is number'
        )
        t.equal(
          isBoolean(config.properties!.booleanProp),
          true,
          'booleanProp is boolean'
        )
        t.equal(
          isString(config.properties!.selectProp),
          true,
          'selectProp is string'
        )
        t.equal(
          isString(config.properties!.selectPropPlatform),
          true,
          'selectPropPlatform is string'
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

    // --------------------------------------------------------------------------
    // Test defaults.

    await t.test('defaults', async (t): Promise<void> => {
      const mockContext = {
        log: new Logger({ level: 'info' }),
        config: {
          projectName: 'test-project',
          properties: {
            stringProp: '',
          },
          cwd: process.cwd(),
        },
      }

      class XpmInitTemplate extends XpmInitTemplateBase {
        async generate(): Promise<void> {
          t.ok(true, 'generate() called')

          const config = this._context.config

          t.equal(
            isString(config.properties!.stringProp),
            true,
            'stringProp is string'
          )
          t.equal(
            config.properties!.stringProp,
            propertiesDefinitions.stringProp.default,
            'stringProp is default'
          )

          t.equal(
            isNumber(config.properties!.numberProp),
            true,
            'numberProp is number'
          )
          t.equal(
            config.properties!.numberProp,
            propertiesDefinitions.numberProp.default,
            'numberProp is default'
          )

          t.equal(
            isBoolean(config.properties!.booleanProp),
            true,
            'booleanProp is boolean'
          )
          t.equal(
            config.properties!.booleanProp,
            propertiesDefinitions.booleanProp.default,
            'booleanProp is default'
          )

          t.equal(
            isBoolean(config.properties!.booleanPropTrue),
            true,
            'booleanPropTrue is boolean'
          )
          t.equal(
            config.properties!.booleanPropTrue,
            propertiesDefinitions.booleanPropTrue.default,
            'booleanPropTrue is default'
          )

          t.equal(
            isString(config.properties!.selectProp),
            true,
            'selectProp is string'
          )
          t.equal(
            config.properties!.selectProp,
            propertiesDefinitions.selectProp.default,
            'selectProp is default'
          )

          t.equal(
            isString(config.properties!.selectPropPlatform),
            true,
            'selectPropPlatform is string'
          )
          t.equal(
            config.properties!.selectPropPlatform,
            propertiesDefinitions.selectPropPlatform.default,
            'selectPropPlatform is default'
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

      t.end()
    })

    // --------------------------------------------------------------------------
    // Test errors.

    await t.test('missing property', async (t): Promise<void> => {
      const mockContext = {
        log: new Logger({ level: 'info' }),
        config: {
          projectName: 'test-project',
          properties: {
            undefinedProp: 'some value',
          },
          cwd: process.cwd(),
        },
      }

      try {
        const template = new XpmInitTemplate({
          context: mockContext,
          __dirname: '/my/dir',
          templatesPath: '/my/templates',
          propertiesDefinitions,
          process: mockProcess,
        })

        await template.run()
        t.fail('should have thrown for missing property')
      } catch (error) {
        t.type(error, XpmSyntaxError, 'threw an error for missing property')
      }
      t.end()
    })

    await t.test('platform not supported', async (t): Promise<void> => {
      const mockContext = {
        log: new Logger({ level: 'info' }),
        config: {
          projectName: 'test-project',
          properties: {
            selectPropPlatform: 'some option3',
          },
          cwd: process.cwd(),
        },
      }

      try {
        const template = new XpmInitTemplate({
          context: mockContext,
          __dirname: '/my/dir',
          templatesPath: '/my/templates',
          propertiesDefinitions,
          process: mockProcess,
        })

        await template.run()
        t.fail('should have thrown for unsupported platform')
      } catch (error) {
        t.type(error, XpmSyntaxError, 'threw an error for unsupported platform')
      }
      t.end()
    })

    await t.test('bad binary value', async (t): Promise<void> => {
      const mockContext = {
        log: new Logger({ level: 'info' }),
        config: {
          projectName: 'test-project',
          properties: {
            booleanProp: 'maybe',
          },
          cwd: process.cwd(),
        },
      }

      try {
        const template = new XpmInitTemplate({
          context: mockContext,
          __dirname: '/my/dir',
          templatesPath: '/my/templates',
          propertiesDefinitions,
          process: mockProcess,
        })

        await template.run()
        t.fail('should have thrown for bad binary value')
      } catch (error) {
        t.type(error, XpmSyntaxError, 'threw an error for bad binary value')
      }
      t.end()
    })

    await t.test('bad number', async (t): Promise<void> => {
      const mockContext = {
        log: new Logger({ level: 'info' }),
        config: {
          projectName: 'test-project',
          properties: {
            numberProp: 'not a number',
          },
          cwd: process.cwd(),
        },
      }

      try {
        const template = new XpmInitTemplate({
          context: mockContext,
          __dirname: '/my/dir',
          templatesPath: '/my/templates',
          propertiesDefinitions,
          process: mockProcess,
        })

        await template.run()
        t.fail('should have thrown for bad number value')
      } catch (error) {
        t.type(error, XpmSyntaxError, 'threw an error for bad number value')
      }
      t.end()
    })

    await t.test('string without default', async (t): Promise<void> => {
      const mockContext = {
        log: new Logger({ level: 'info' }),
        config: {
          projectName: 'test-project',
          properties: {
            stringPropNoDefault: '',
          },
          cwd: process.cwd(),
        },
      }
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'String Property',
          description: 'A string property for testing',
          type: 'string',
          items: {},
          isMandatory: false,
          default: 'defaultString',
        },
        stringPropNoDefault: {
          label: 'String Property Without Default',
          description: 'A string property for testing',
          type: 'string',
          items: {},
          isMandatory: false,
        },
      }

      try {
        const template = new XpmInitTemplate({
          context: mockContext,
          __dirname: '/my/dir',
          templatesPath: '/my/templates',
          propertiesDefinitions,
          process: mockProcess,
        })

        await template.run()
        t.fail('should have thrown for string without default value')
      } catch (error) {
        t.type(
          error,
          XpmSyntaxError,
          'threw an error for string without default value'
        )
      }
      t.end()
    })

    t.end()
  }
)

// ----------------------------------------------------------------------------

await t.test(
  'XpmInitTemplateBase._validatePropertiesDefinitions()',
  async (t): Promise<void> => {
    class XpmInitTemplate extends XpmInitTemplateBase {
      async generate(): Promise<void> {
        t.fail('generate() should not be called')
      }
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions =
        42 as unknown as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'is not an object',
        'error message is "not an object"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions =
        {} as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'is an empty object',
        'error message is "is an empty object"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {} as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'must have a string label',
        'error message is "must have a string label"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 42 as unknown as string,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'must have a string label',
        'error message is "must have a string label"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: ' ',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has an empty label',
        'error message is "has an empty label"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'string property',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'must have a string description',
        'error message is "must have a string description"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'string property',
          description: 42 as unknown as string,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'must have a string description',
        'error message is "must have a string description"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'string property',
          description: ' ',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has an empty description',
        'error message is "has an empty description"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'string property',
          description: 'string description',
          isMandatory: 'not a boolean' as unknown as boolean,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has a non boolean isMandatory value',
        'error message is "has a non boolean isMandatory value"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'string property',
          description: 'string description',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has no type defined',
        'error message is "has no type defined"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        "type 'select' has no items",
        'error message is "type \'select\' has no items"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: 42 as unknown as XpmInitTemplateItems,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        "type 'select' has invalid items",
        'error message is "type \'select\' has invalid items"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {} as unknown as XpmInitTemplateItems,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        "type 'select' has no items",
        'error message is "type \'select\' has no items"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {
            option1: 42 as unknown as string,
          } as unknown as XpmInitTemplateItems,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has invalid item',
        'error message is "has invalid item"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {
            option1: {
              platforms: 'not an array' as unknown as string[],
              message: 'Option 1',
            },
          } as unknown as XpmInitTemplateItems,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has invalid item',
        'error message is "has invalid item"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {
            option1: {
              platforms: ['linux', 'win32'],
              message: 42 as unknown as string,
            },
          } as unknown as XpmInitTemplateItems,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has invalid item',
        'error message is "has invalid item"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {
            option1: 'option 1',
            option2: 'option 2',
          },
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'must have a default value if not mandatory',
        'error message is "hmust have a default value if not mandatory"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {
            option1: 'option 1',
            option2: 'option 2',
          },
          default: 42 as unknown as string,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has a non string default value',
        'error message is "has a non string default value"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {
            option1: 'option 1',
            option2: 'option 2',
          },
          default: ' ',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has an empty default value',
        'error message is "has an empty default value"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        selectProp: {
          label: 'select property',
          description: 'select description',
          type: 'select',
          items: {
            option1: 'option 1',
            option2: 'option 2',
          },
          default: 'nonexistent option',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has a default value not in items list',
        'error message is "has a default value not in items list"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'string property',
          description: 'string description',
          type: 'string',
          default: 42,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has a non string default value',
        'error message is "has a non string default value"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        stringProp: {
          label: 'string property',
          description: 'string description',
          type: 'string',
          default: ' ',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has an empty default value',
        'error message is "has an empty default value"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        numberProp: {
          label: 'number property',
          description: 'number description',
          type: 'number',
          default: 'not a number',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has a non number default value',
        'error message is "has a non number default value"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        BooleanProp: {
          label: 'boolean property',
          description: 'boolean description',
          type: 'boolean',
          default: 'not a boolean',
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has a non boolean default value',
        'error message is "has a non boolean default value"'
      )
    }

    try {
      const propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {
        unknownProp: {
          label: 'unknown property',
          description: 'unknown description',
          type: 'unknown' as XpmInitTemplateType,
        } as XpmInitTemplatePropertiesDefinition,
      } as XpmInitTemplatePropertiesDefinitions

      const template = new XpmInitTemplate({
        context: mockContext,
        __dirname: '/my/dir',
        templatesPath: '/my/templates',
        propertiesDefinitions,
        process: mockProcess,
      })
      t.fail('should have thrown')
    } catch (error) {
      t.type(error, AssertionError, 'threw an AssertionError')
      t.match(
        (error as AssertionError).message,
        'has unsupported type',
        'error message is "has unsupported type"'
      )
    }

    t.end()
  }
)

// ----------------------------------------------------------------------------

t.test('XpmInitTemplateBase.isPlatformSupported()', (t): void => {
  const mockProcess: NodeJS.Process = {
    env: {},
    platform: 'linux',
    arch: 'x64',
  } as unknown as NodeJS.Process

  class XpmInitTemplate extends XpmInitTemplateBase {
    async generate(): Promise<void> {
      t.fail('generate() should not be called')
    }
  }

  const template = new XpmInitTemplate({
    context: mockContext,
    __dirname: '/my/dir',
    templatesPath: '/my/templates',
    propertiesDefinitions,
    process: mockProcess,
  })

  t.equal(
    template.isPlatformSupported(['linux-x64', 'win32']),
    true,
    'linux-x64 is supported'
  )

  t.equal(
    template.isPlatformSupported(['linux', 'win32']),
    true,
    'linux is supported'
  )

  t.equal(
    template.isPlatformSupported(['darwin']),
    false,
    'darwin is not supported'
  )

  try {
    template.isPlatformSupported([])
    t.fail('should have thrown for empty platform list')
  } catch (error) {
    t.type(error, AssertionError, 'threw an AssertionError')
    t.match(
      (error as AssertionError).message,
      'platforms array is required',
      'error message is "platforms array is required"'
    )
  }

  t.end()
})

// ----------------------------------------------------------------------------

await t.test(
  'XpmInitTemplateBase copy files/folders',
  async (t): Promise<void> => {
    class XpmInitTemplate extends XpmInitTemplateBase {
      async generate(): Promise<void> {
        t.ok(true, 'generate() called')

        const temporaryFolderPath = await fs.mkdtemp(
          path.join(os.tmpdir(), 'copy-')
        )

        const destinationFolderPath = path.join(temporaryFolderPath, 'output')
        const destinationFilePath = path.join(
          destinationFolderPath,
          'hello-liquid.txt'
        )

        await this.copyFile({
          sourceFileRelativePath: 'hello-liquid.txt',
          destinationFilePath,
        })

        let fileContent = await fs.readFile(destinationFilePath, 'utf-8')
        t.match(
          fileContent,
          'Hello, {{ projectName }}!',
          'file content is correct'
        )

        await this.copyFolder({
          sourceFolderRelativePath: 'copy',
          destinationFolderPath,
        })

        fileContent = await fs.readFile(
          path.join(destinationFolderPath, 'file1.md'),
          'utf-8'
        )
        t.match(fileContent, '# file1.md', 'file1.md content is correct')

        fileContent = await fs.readFile(
          path.join(destinationFolderPath, 'subfolder', 'file2.md'),
          'utf-8'
        )
        t.match(fileContent, '# file2.md', 'file2.md content is correct')

        await fs.rm(temporaryFolderPath, { recursive: true, force: true })
      }
    }

    // console.log(fixturesFolderPath)

    const template = new XpmInitTemplate({
      context: mockContext,
      __dirname: '/my/dir',
      templatesPath: path.join(fixturesFolderPath, 'template'),
      propertiesDefinitions,
      process: mockProcess,
    })

    const exitCode = await template.run()
    t.equal(exitCode, 0, 'exit code is 0')

    t.end()
  }
)

// ----------------------------------------------------------------------------

await t.test('XpmInitTemplateBase.render()', async (t): Promise<void> => {
  class XpmInitTemplate extends XpmInitTemplateBase {
    async generate(): Promise<void> {
      t.ok(true, 'generate() called')

      const temporaryFolderPath = await fs.mkdtemp(
        path.join(os.tmpdir(), 'render-')
      )

      const sourceFilePath = path.join(this._templatesPath, 'hello-liquid.txt')
      const destinationFilePath = path.join(
        temporaryFolderPath,
        'output',
        'hello.txt'
      )

      await this.render({
        sourceFilePath,
        destinationFilePath,
        substitutionsVariables: { projectName: 'Test', properties: {} },
      })

      const renderedContent = await fs.readFile(destinationFilePath, 'utf-8')
      t.match(renderedContent, 'Hello, Test!', 'rendered content is correct')

      try {
        await this.render({
          sourceFilePath,
          destinationFilePath,
          substitutionsVariables: { noProjectName: 'Test', properties: {} },
        })
        t.fail('should have thrown for missing substitution variable')
      } catch (error) {
        t.type(error, XpmOutputError, 'threw an XpmOutputError')
        t.match(
          (error as AssertionError).message,
          'undefined variable',
          'error message is "undefined variable"'
        )
      } finally {
        await fs.rm(temporaryFolderPath, { recursive: true, force: true })
      }
    }
  }

  // console.log(fixturesFolderPath)

  const template = new XpmInitTemplate({
    context: mockContext,
    __dirname: '/my/dir',
    templatesPath: path.join(fixturesFolderPath, 'template'),
    propertiesDefinitions,
    process: mockProcess,
  })

  const exitCode = await template.run()
  t.equal(exitCode, 0, 'exit code is 0')

  t.end()
})

// ----------------------------------------------------------------------------

t.test('XpmInitTemplateBase.askForMoreValues()', (t): void => {
  t.end()
})

// ----------------------------------------------------------------------------
