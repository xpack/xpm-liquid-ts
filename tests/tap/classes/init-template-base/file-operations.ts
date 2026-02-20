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

import * as os from 'node:os'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'

// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesFolderPath = path.join(
  path.dirname(path.dirname(path.dirname(__dirname))),
  'fixtures'
)

const mockProcess: NodeJS.Process = {
  env: {},
} as unknown as NodeJS.Process

// const mockContext: xpm.Context = {
//   log: new Logger({ level: 'info' }),
//   config: {
//     projectName: 'test-project',
//     properties: {
//       stringProp: 'a string',
//     },
//     cwd: process.cwd(),
//   },
// }

const propertiesDefinitions: xpm.InitTemplatePropertiesDefinitions = {
  stringProp: {
    label: 'String Property',
    description: 'A string property for testing',
    type: 'string',
    default: 'defaultString',
  },
}

// class XpmInitTemplate extends xpm.InitTemplateBase {
//   async generate(): Promise<void> {}
// }

// ----------------------------------------------------------------------------

await t.test(
  'InitTemplateBase - copy files and folders',
  async (t): Promise<void> => {
    class XpmInitTemplate extends xpm.InitTemplateBase {
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

    const mockContext: xpm.Context = {
      log: new Logger({ level: 'silent' }),
      config: {
        projectName: 'test-project',
        properties: {
          stringProp: 'a string',
        },
        cwd: process.cwd(),
      },
    }

    const template = new XpmInitTemplate({
      context: mockContext,
      __dirname: '/my/dir',
      templatesPath: path.join(fixturesFolderPath, 'template'),
      propertiesDefinitions,
      process: mockProcess,
    })

    const exitCode = await template.run()
    t.equal(exitCode, 0, 'exit code is 0')
  }
)

// ----------------------------------------------------------------------------

await t.test('InitTemplateBase - render()', async (t): Promise<void> => {
  class XpmInitTemplate extends xpm.InitTemplateBase {
    async generate(): Promise<void> {
      t.ok(true, 'generate() called')

      const temporaryFolderPath = await fs.mkdtemp(
        path.join(os.tmpdir(), 'render-')
      )

      const sourceFilePath = path.join(this.templatesPath, 'hello-liquid.txt')
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

      await t.rejects(
        () =>
          this.render({
            sourceFilePath,
            destinationFilePath,
            substitutionsVariables: { noProjectName: 'Test', properties: {} },
          }),
        {
          constructor: xpm.OutputError,
          message: /undefined variable/,
        },
        'throws XpmOutputError with "undefined variable"'
      )

      await fs.rm(temporaryFolderPath, { recursive: true, force: true })
    }
  }

  const mockContext: xpm.Context = {
    log: new Logger({ level: 'silent' }),
    config: {
      projectName: 'test-project',
      properties: {
        stringProp: 'a string',
      },
      cwd: process.cwd(),
    },
  }

  const template = new XpmInitTemplate({
    context: mockContext,
    __dirname: '/my/dir',
    templatesPath: path.join(fixturesFolderPath, 'template'),
    propertiesDefinitions,
    process: mockProcess,
  })

  const exitCode = await template.run()
  t.equal(exitCode, 0, 'exit code is 0')
})

// ----------------------------------------------------------------------------

t.test('InitTemplateBase - copyFile() assertions', (t): void => {
  class XpmInitTemplate extends xpm.InitTemplateBase {
    async generate(): Promise<void> {
      t.ok(true, 'generate() called')

      await t.rejects(
        () =>
          this.copyFile({
            sourceFileRelativePath: undefined as unknown as string,
            destinationFilePath: '/output/file.txt',
          }),
        {
          name: 'AssertionError',
          message: /sourceFileRelativePath is required/,
        },
        'throws AssertionError with "sourceFileRelativePath is required"'
      )

      await t.rejects(
        () =>
          this.copyFile({
            sourceFileRelativePath: '',
            destinationFilePath: '/output/file.txt',
          }),
        {
          name: 'AssertionError',
          message: /sourceFileRelativePath is required/,
        },
        'throws AssertionError with empty sourceFileRelativePath'
      )

      await t.rejects(
        () =>
          this.copyFile({
            sourceFileRelativePath: 'file.txt',
            destinationFilePath: '',
          }),
        {
          name: 'AssertionError',
          message: /destinationFilePath is required/,
        },
        'throws AssertionError with "destinationFilePath is required"'
      )
    }
  }

  const mockContext: xpm.Context = {
    log: new Logger({ level: 'silent' }),
    config: {
      projectName: 'test-project',
      properties: {
        stringProp: 'a string',
      },
      cwd: process.cwd(),
    },
  }

  const template = new XpmInitTemplate({
    context: mockContext,
    __dirname: '/my/dir',
    templatesPath: path.join(fixturesFolderPath, 'template'),
    propertiesDefinitions,
    process: mockProcess,
  })

  template.run().then(
    () => {
      t.pass('run completed successfully')
      t.end()
    },
    (error) => {
      t.fail(`run failed: ${String(error)}`)
      t.end()
    }
  )
})

t.test('InitTemplateBase - copyFolder() assertions', (t): void => {
  class XpmInitTemplate extends xpm.InitTemplateBase {
    async generate(): Promise<void> {
      t.ok(true, 'generate() called')

      await t.rejects(
        () =>
          this.copyFolder({
            sourceFolderRelativePath: undefined as unknown as string,
            destinationFolderPath: '/output',
          }),
        {
          name: 'AssertionError',
          message: /sourceFolderRelativePath is required/,
        },
        'throws AssertionError with "sourceFolderRelativePath is required"'
      )

      await t.rejects(
        () =>
          this.copyFolder({
            sourceFolderRelativePath: '',
            destinationFolderPath: '/output',
          }),
        {
          name: 'AssertionError',
          message: /sourceFolderRelativePath is required/,
        },
        'throws AssertionError with empty sourceFolderRelativePath'
      )

      await t.rejects(
        () =>
          this.copyFolder({
            sourceFolderRelativePath: 'folder',
            destinationFolderPath: '',
          }),
        {
          name: 'AssertionError',
          message: /destinationFolderPath is required/,
        },
        'throws AssertionError with "destinationFolderPath is required"'
      )
    }
  }

  const mockContext: xpm.Context = {
    log: new Logger({ level: 'silent' }),
    config: {
      projectName: 'test-project',
      properties: {
        stringProp: 'a string',
      },
      cwd: process.cwd(),
    },
  }

  const template = new XpmInitTemplate({
    context: mockContext,
    __dirname: '/my/dir',
    templatesPath: path.join(fixturesFolderPath, 'template'),
    propertiesDefinitions,
    process: mockProcess,
  })

  template.run().then(
    () => {
      t.pass('run completed successfully')
      t.end()
    },
    (error) => {
      t.fail(`run failed: ${String(error)}`)
      t.end()
    }
  )
})

await t.test(
  'InitTemplateBase - render() assertions',
  async (t): Promise<void> => {
    class XpmInitTemplate extends xpm.InitTemplateBase {
      async generate(): Promise<void> {
        t.ok(true, 'generate() called')

        await t.rejects(
          () =>
            this.render({
              sourceFilePath: undefined as unknown as string,
              destinationFilePath: '/output/file.txt',
            }),
          {
            name: 'AssertionError',
            message: /sourceFilePath is required/,
          },
          'throws AssertionError with "sourceFilePath is required"'
        )

        await t.rejects(
          () =>
            this.render({
              sourceFilePath: path.join(this.templatesPath, 'hello-liquid.txt'),
              destinationFilePath: undefined as unknown as string,
            }),
          {
            name: 'AssertionError',
            message: /destinationFilePath is required/,
          },
          'throws AssertionError with "destinationFilePath is required"'
        )
      }
    }

    const mockContext: xpm.Context = {
      log: new Logger({ level: 'silent' }),
      config: {
        projectName: 'test-project',
        properties: {
          stringProp: 'a string',
        },
        cwd: process.cwd(),
      },
    }

    const template = new XpmInitTemplate({
      context: mockContext,
      __dirname: '/my/dir',
      templatesPath: path.join(fixturesFolderPath, 'template'),
      propertiesDefinitions,
      process: mockProcess,
    })

    const exitCode = await template.run()
    t.equal(exitCode, 0, 'exit code is 0')
  }
)

await t.test(
  'InitTemplateBase - render() without substitutionsVariables',
  async (t): Promise<void> => {
    class XpmInitTemplate extends xpm.InitTemplateBase {
      async generate(): Promise<void> {
        // Do nothing.
      }
    }

    const mockContext: xpm.Context = {
      log: new Logger({ level: 'silent' }),
      config: {
        projectName: 'test-project',
        properties: {
          stringProp: 'a string',
        },
        cwd: process.cwd(),
      },
    }

    const template = new XpmInitTemplate({
      context: mockContext,
      __dirname: '/my/dir',
      templatesPath: path.join(fixturesFolderPath, 'template'),
      propertiesDefinitions,
      process: mockProcess,
    })

    // Do not call run(), so substitutionsVariables is not initialised.

    const sourceFilePath = path.join(template.templatesPath, 'hello-liquid.txt')
    const destinationFilePath = '/tmp/output.txt'

    await t.rejects(
      () =>
        template.render({
          sourceFilePath,
          destinationFilePath,
        }),
      {
        name: 'AssertionError',
        message: /substitutionsVariables is required/,
      },
      'throws AssertionError with "substitutionsVariables is required"'
    )
  }
)

// ----------------------------------------------------------------------------
