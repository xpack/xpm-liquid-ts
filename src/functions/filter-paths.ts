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

/**
 * Replaces non-alphanumeric characters with dashes to make paths
 * comply with file system names.
 *
 * @remarks
 * This function sanitizes strings to be safely used as file or folder names
 * by removing or replacing problematic characters that could cause issues
 * across different file systems.
 *
 * Platform-specific processing:
 *
 * <ul>
 * <li>Windows: Preserves backslashes (\\) and colons (:) for drive letters
 *   and path separators (e.g., C:\\path\\to\\file). Replaces all other
 *   non-alphanumeric characters with dashes.</li>
 * <li>POSIX (Linux, macOS): Preserves forward slashes (/) for path
 *   separators. Replaces all other non-alphanumeric characters with
 *   dashes.</li>
 * </ul>
 *
 * Post-processing: After character replacement, consecutive dashes are
 * collapsed to a single dash to avoid excessive dashes from adjacent
 * special characters (e.g., "foo--bar" becomes "foo-bar").
 *
 * Common use cases include sanitizing build configuration names,
 * user-provided identifiers, and template-generated path components.
 *
 * @param input - A path candidate.
 * @returns A validated path.
 */
export function filterPath(input: string): string {
  /* c8 ignore start */ /* istanbul ignore next */
  const fixed =
    os.platform() === 'win32'
      ? input.replace(/[^a-zA-Z0-9\\:]+/g, '-')
      : input.replace(/[^a-zA-Z0-9/]+/g, '-')
  /* c8 ignore stop */
  return fixed.replace(/--/g, '-')
}

/**
 * Replaces non-alphanumeric characters with dashes to make paths
 * comply with POSIX file system names.
 *
 * @remarks
 * This function provides explicit POSIX path sanitization regardless of the
 * current platform. Useful when generating paths that will be used on
 * Linux or macOS systems, or when consistency across platforms is required.
 *
 * Processing rules:
 *
 * <ul>
 * <li>Preserves forward slashes (/) for path separators.</li>
 * <li>Replaces all non-alphanumeric characters (except /) with dashes.</li>
 * <li>Collapses consecutive dashes to single dashes.</li>
 * </ul>
 *
 * Use this function instead of {@link filterPath} when you need guaranteed
 * POSIX-style sanitization even when running on Windows, such as when
 * generating paths for remote Linux systems or container images.
 *
 * @param input - A path candidate.
 * @returns A validated path.
 */
export function filterPosixPath(input: string): string {
  /* istanbul ignore next */
  const fixed = input.replace(/[^a-zA-Z0-9/]+/g, '-')

  return fixed.replace(/--/g, '-')
}

/**
 * Replaces non-alphanumeric characters with dashes to make paths
 * comply with Windows file system names.
 *
 * @remarks
 * This function provides explicit Windows path sanitization regardless of
 * the current platform. Useful when generating paths that will be used on
 * Windows systems, or when consistency across platforms is required.
 *
 * Processing rules:
 *
 * <ul>
 * <li>Preserves backslashes (\) for path separators.</li>
 * <li>Preserves colons (:) for drive letter designation (e.g., C:).</li>
 * <li>Replaces all other non-alphanumeric characters with dashes.</li>
 * <li>Collapses consecutive dashes to single dashes.</li>
 * </ul>
 *
 * Use this function instead of {@link filterPath} when you need guaranteed
 * Windows-style sanitization even when running on POSIX systems, such as
 * when generating paths for remote Windows systems or WSL environments.
 *
 * @param input - A path candidate.
 * @returns A validated path.
 */
export function filterWin32Path(input: string): string {
  /* istanbul ignore next */
  const fixed = input.replace(/[^a-zA-Z0-9\\:]+/g, '-')

  return fixed.replace(/--/g, '-')
}

// ----------------------------------------------------------------------------
