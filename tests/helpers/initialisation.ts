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

import { type Test } from 'tap'

// ----------------------------------------------------------------------------

/**
 * Tests the idempotent initialisation pattern.
 *
 * @remarks
 * This helper function verifies that an object's <code>initialise()</code>
 * method behaves correctly by returning <code>true</code> on the first call
 * and <code>false</code> on subsequent calls. This enforces
 * single-initialisation semantics, ensuring that initialisation logic is
 * executed only once.
 *
 * The helper reduces code duplication across test files where this pattern
 * is commonly tested (31+ occurrences in the test suite).
 *
 * @param t - The Tap test instance for making assertions.
 * @param instance - The object instance with an <code>initialise()</code>
 * method to be tested.
 * @param name - A descriptive name used in assertion messages to identify
 * which object is being tested.
 */
export async function testIdempotentInitialisation(
  t: Test,
  instance: { initialise: () => Promise<boolean> },
  name: string
): Promise<void> {
  const first = await instance.initialise()
  t.equal(first, true, `${name}.initialise() returns true on first call`)

  const second = await instance.initialise()
  t.equal(second, false, `${name}.initialise() returns false on second call`)
}

// ----------------------------------------------------------------------------
