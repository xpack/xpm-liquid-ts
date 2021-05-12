/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021 Liviu Ionescu. All rights reserved.
 *
 * Licensed under the terms of the MIT License.
 * See LICENSE in the project root for license information.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
/* eslint-disable @typescript-eslint/no-floating-promises */

// ----------------------------------------------------------------------------

// import * as os from 'os'

// The `[node-tap](http://www.node-tap.org)` framework.
import * as tap from 'tap'
import { XpmLiquid } from '../../lib/xpm-liquid'
import { Logger } from '@xpack/logger'

const log = new Logger({ level: 'info' })

tap.test('XpmLiquid minimal', (t) => {
  const xpmLiquid = new XpmLiquid(log)
  const minimalPackage = {
    name: 'n',
    version: '0.1.2'
  }

  const map = xpmLiquid.prepareMap(minimalPackage)

  t.ok(map.env, 'has env')
  t.ok(map.os, 'has os')
  t.ok(map.path, 'has path')
  t.ok(map.package, 'has package')

  t.ok(map.properties, 'has a properties object')
  t.equal(Object.keys(map.properties as {}).length, 0, 'has 0 properties')

  t.end()
})

tap.test('XpmLiquid xpack', (t) => {
  const xpmLiquid = new XpmLiquid(log)
  const xpack = {
    name: 'n',
    version: '0.1.2',
    xpack: {
      properties: {
        one: '1'
      }
    }
  }

  const map = xpmLiquid.prepareMap(xpack)

  t.ok(map.env, 'has env')
  t.ok(map.os, 'has os')
  t.ok(map.path, 'has path')
  t.ok(map.package, 'has package')

  t.ok(map.properties, 'has a properties object')
  t.equal(Object.keys(map.properties as {}).length, 1, 'has 1 properties')

  t.end()
})

tap.test('XpmLiquid xpack config', (t) => {
  const xpmLiquid = new XpmLiquid(log)
  const xpack = {
    name: 'n',
    version: '0.1.2',
    xpack: {
      properties: {
        one: '1'
      },
      buildConfigurations: {
        debug: {
          properties: {
            two: '2'
          }
        }
      }
    }
  }

  const map = xpmLiquid.prepareMap(xpack, 'debug')

  t.ok(map.env, 'has env')
  t.ok(map.os, 'has os')
  t.ok(map.path, 'has path')
  t.ok(map.package, 'has package')

  t.ok(map.properties, 'has a properties object')
  t.equal(Object.keys(map.properties as {}).length, 2, 'has 2 properties')

  t.end()
})

tap.test('XpmLiquid xpack no objs', (t) => {
  const xpmLiquid = new XpmLiquid(log)
  const xpack = {
    name: 'n',
    version: '0.1.2',
    xpack: {
      properties: false,
      buildConfigurations: {
        debug: {
          properties: false
        }
      }
    }
  }

  const map = xpmLiquid.prepareMap(xpack, 'debug')

  t.ok(map.env, 'has env')
  t.ok(map.os, 'has os')
  t.ok(map.path, 'has path')
  t.ok(map.package, 'has package')

  t.ok(map.properties, 'has a properties object')
  t.equal(Object.keys(map.properties as {}).length, 0, 'has 0 properties')

  t.end()
})

tap.test('XpmLiquid xpack bad configs', (t) => {
  const xpmLiquid = new XpmLiquid(log)
  const xpack = {
    name: 'n',
    version: '0.1.2',
    xpack: {
      properties: {
        one: '1'
      }
    }
  }

  try {
    xpmLiquid.prepareMap(xpack, 'debug')
  } catch (ex) {
    // console.log(ex)
    t.ok(true, `throws '${(ex as Error).message}'`)
  }

  t.end()
})

tap.test('XpmLiquid xpack bad config debug', (t) => {
  const log = new Logger({ level: 'info' })

  const xpmLiquid = new XpmLiquid(log)
  const xpack = {
    name: 'n',
    version: '0.1.2',
    xpack: {
      properties: {
        one: '1'
      },
      buildConfigurations: {
        default: {
          properties: {
            two: '2'
          }
        }
      }
    }
  }

  try {
    xpmLiquid.prepareMap(xpack, 'debug')
  } catch (ex) {
    // console.log(ex)
    t.ok(true, `throws '${(ex as Error).message}'`)
  }

  t.end()
})

// ----------------------------------------------------------------------------
