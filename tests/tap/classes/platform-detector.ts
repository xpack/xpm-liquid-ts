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

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'

// ============================================================================

await t.test(
  'PlatformDetector - default behaviour',
  async (t): Promise<void> => {
    const detector = new xpm.PlatformDetector()

    const info = detector.getPlatformInfo()
    t.equal(info.platform, process.platform, 'platform matches process')
    t.equal(info.arch, process.arch, 'arch matches process')

    t.end()
  }
)

await t.test(
  'PlatformDetector - default with 32-bit coercion',
  async (t): Promise<void> => {
    const detector = new xpm.PlatformDetector()

    if (process.arch === 'x64') {
      const info = detector.getPlatformInfo({ doForce32bit: true })
      t.equal(info.platform, process.platform, 'platform unchanged')
      t.equal(info.arch, 'ia32', 'x64 coerced to ia32')
    } else if (process.arch === 'arm64') {
      const info = detector.getPlatformInfo({ doForce32bit: true })
      t.equal(info.platform, process.platform, 'platform unchanged')
      t.equal(info.arch, 'arm', 'arm64 coerced to arm')
    } else {
      const info = detector.getPlatformInfo({ doForce32bit: true })
      t.equal(info.arch, process.arch, 'other architectures unchanged')
    }

    t.end()
  }
)

await t.test(
  'PlatformDetector - isWindows() on actual platform',
  async (t): Promise<void> => {
    const detector = new xpm.PlatformDetector()

    const isWin = detector.isWindows()
    t.equal(isWin, process.platform === 'win32', 'matches process.platform')

    t.end()
  }
)

await t.test(
  'PlatformDetector - mocked Linux x64',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'linux',
      arch: 'x64',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo()
    t.equal(info.platform, 'linux', 'mocked platform is linux')
    t.equal(info.arch, 'x64', 'mocked arch is x64')

    const infoForced = detector.getPlatformInfo({ doForce32bit: true })
    t.equal(infoForced.platform, 'linux', 'platform still linux')
    t.equal(infoForced.arch, 'ia32', 'x64 coerced to ia32')

    t.equal(detector.isWindows(), false, 'isWindows() returns false')

    t.end()
  }
)

await t.test(
  'PlatformDetector - mocked Darwin arm64',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'darwin',
      arch: 'arm64',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo()
    t.equal(info.platform, 'darwin', 'mocked platform is darwin')
    t.equal(info.arch, 'arm64', 'mocked arch is arm64')

    const infoForced = detector.getPlatformInfo({ doForce32bit: true })
    t.equal(infoForced.platform, 'darwin', 'platform still darwin')
    t.equal(infoForced.arch, 'arm', 'arm64 coerced to arm')

    t.equal(detector.isWindows(), false, 'isWindows() returns false')

    t.end()
  }
)

await t.test(
  'PlatformDetector - mocked Windows x64',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'win32',
      arch: 'x64',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo()
    t.equal(info.platform, 'win32', 'mocked platform is win32')
    t.equal(info.arch, 'x64', 'mocked arch is x64')

    const infoForced = detector.getPlatformInfo({ doForce32bit: true })
    t.equal(infoForced.platform, 'win32', 'platform still win32')
    t.equal(infoForced.arch, 'ia32', 'x64 coerced to ia32')

    t.equal(detector.isWindows(), true, 'isWindows() returns true')

    t.end()
  }
)

await t.test(
  'PlatformDetector - mocked ia32 (no coercion needed)',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'linux',
      arch: 'ia32',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo()
    t.equal(info.arch, 'ia32', 'arch is ia32')

    const infoForced = detector.getPlatformInfo({ doForce32bit: true })
    t.equal(infoForced.arch, 'ia32', 'ia32 remains ia32 when forced')

    t.end()
  }
)

await t.test(
  'PlatformDetector - mocked arm (no coercion needed)',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'linux',
      arch: 'arm',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo()
    t.equal(info.arch, 'arm', 'arch is arm')

    const infoForced = detector.getPlatformInfo({ doForce32bit: true })
    t.equal(infoForced.arch, 'arm', 'arm remains arm when forced')

    t.end()
  }
)

await t.test(
  'PlatformDetector - mocked unusual architecture',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'freebsd',
      arch: 'ppc64',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo()
    t.equal(info.platform, 'freebsd', 'unusual platform preserved')
    t.equal(info.arch, 'ppc64', 'unusual arch preserved')

    const infoForced = detector.getPlatformInfo({ doForce32bit: true })
    t.equal(
      infoForced.arch,
      'ppc64',
      'unusual arch unchanged when forced (not x64/arm64)'
    )

    t.end()
  }
)

await t.test(
  'PlatformDetector - multiple calls return consistent results',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'darwin',
      arch: 'arm64',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info1 = detector.getPlatformInfo()
    const info2 = detector.getPlatformInfo()
    t.same(info1, info2, 'multiple calls return same result')

    const infoForced1 = detector.getPlatformInfo({ doForce32bit: true })
    const infoForced2 = detector.getPlatformInfo({ doForce32bit: true })
    t.same(infoForced1, infoForced2, 'multiple forced calls return same result')

    t.end()
  }
)

await t.test(
  'PlatformDetector - empty options object',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'linux',
      arch: 'x64',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo({})
    t.equal(info.platform, 'linux', 'platform preserved')
    t.equal(info.arch, 'x64', 'arch not coerced with empty options')

    t.end()
  }
)

await t.test(
  'PlatformDetector - explicit false for doForce32bit',
  async (t): Promise<void> => {
    const mockProcess = {
      platform: 'linux',
      arch: 'x64',
    } as NodeJS.Process

    const detector = new xpm.PlatformDetector(mockProcess)

    const info = detector.getPlatformInfo({ doForce32bit: false })
    t.equal(info.arch, 'x64', 'arch not coerced when explicitly false')

    t.end()
  }
)

await t.test(
  'PlatformDetector - all platform combinations',
  async (t): Promise<void> => {
    const platforms = ['darwin', 'linux', 'win32', 'freebsd']
    const architectures = ['x64', 'arm64', 'ia32', 'arm']

    for (const platform of platforms) {
      for (const arch of architectures) {
        const mockProcess = {
          platform,
          arch,
        } as NodeJS.Process

        const detector = new xpm.PlatformDetector(mockProcess)
        const info = detector.getPlatformInfo()

        t.equal(
          info.platform,
          platform,
          `${platform}-${arch}: platform correct`
        )
        t.equal(info.arch, arch, `${platform}-${arch}: arch correct`)

        t.equal(
          detector.isWindows(),
          platform === 'win32',
          `${platform}-${arch}: isWindows() correct`
        )
      }
    }

    t.end()
  }
)

await t.test(
  'PlatformDetector - architecture coercion coverage',
  async (t): Promise<void> => {
    const testCases = [
      { input: 'x64', expected: 'ia32' },
      { input: 'arm64', expected: 'arm' },
      { input: 'ia32', expected: 'ia32' },
      { input: 'arm', expected: 'arm' },
      { input: 'ppc64', expected: 'ppc64' },
      { input: 's390x', expected: 's390x' },
    ]

    for (const { input, expected } of testCases) {
      const mockProcess = {
        platform: 'linux',
        arch: input,
      } as NodeJS.Process

      const detector = new xpm.PlatformDetector(mockProcess)
      const info = detector.getPlatformInfo({ doForce32bit: true })

      t.equal(
        info.arch,
        expected,
        `${input} coerced to ${expected} when doForce32bit=true`
      )
    }

    t.end()
  }
)

// ----------------------------------------------------------------------------
