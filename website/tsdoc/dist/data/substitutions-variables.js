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
import * as os from 'node:os';
import * as path from 'node:path';
/**
 * The base substitution variables initialised from the current environment.
 *
 * @remarks
 * This constant provides the foundation for all Liquid template processing,
 * capturing the runtime environment once at module load time.
 *
 * Initialization strategy:
 *
 * 1. Environment variables: Snapshot of process.env at load time.
 *
 * 2. OS information: Calls to os module functions (platform, arch, etc.).
 *
 * 3. Path constants: Platform-specific separators and delimiters.
 *
 * 4. Empty properties: Placeholder for package-specific additions.
 *
 * These base variables are shared across all template processing within the
 * application and extended with package, configuration, and matrix variables
 * as needed. The base object is typically spread into new contexts rather
 * than mutated, preserving the original snapshot.
 *
 * @public
 */
// eslint-disable-next-line max-len
export const xpmLiquidSubstitutionsVariablesBase = {
    env: process.env,
    os: {
        EOL: os.EOL,
        arch: os.arch(),
        constants: {
            signals: os.constants.signals,
            errno: os.constants.errno,
        },
        cpus: os.cpus(),
        endianness: os.endianness(),
        homedir: os.homedir(),
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        tmpdir: os.tmpdir(),
        type: os.type(),
        // os.version() available since 12.x
        version: os.version(),
    },
    path: {
        delimiter: path.delimiter,
        sep: path.sep,
        win32: {
            delimiter: path.win32.delimiter,
            sep: path.win32.sep,
        },
        posix: {
            delimiter: path.posix.delimiter,
            sep: path.posix.sep,
        },
    },
    properties: {},
};
// ----------------------------------------------------------------------------
