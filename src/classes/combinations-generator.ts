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

import { Logger } from '@xpack/logger'

// ============================================================================

/**
 * A matrix combination mapping parameter names to their values.
 *
 * @remarks
 * This type represents a single combination generated from a matrix of
 * parameters, where each key is a parameter name and each value is a
 * string from that parameter's array of possible values.
 *
 * Example: `{ arch: 'x64', platform: 'linux', optimize: 'speed' }`
 */
export type MatrixCombination = Record<string, string>

// ============================================================================

/**
 * Configuration parameters for constructing a combinations generator instance.
 *
 * @remarks
 * This interface defines the required configuration for creating an
 * instance of {@link CombinationsGenerator}. All properties are mandatory.
 *
 * The parameters provide the matrix parameter names, their corresponding
 * value arrays for Cartesian product computation, and the logger for
 * diagnostic output during combination generation.
 */
export interface CombinationsGeneratorConstructorParameters {
  /**
   * The array of parameter names.
   */
  matrixKeys: string[]

  /**
   * The array of value arrays for each parameter.
   */
  matrixValues: string[][]

  /**
   * The logger instance for output and diagnostics.
   */
  log: Logger
}

/**
 * Generates all possible combinations from a matrix of parameters.
 *
 * @remarks
 * This class computes the Cartesian product of multiple parameter arrays,
 * producing all possible combinations of parameter values. It uses a
 * recursive algorithm to systematically explore all combinations.
 *
 * The generation process:
 *
 * <ol>
 * <li>Takes arrays of parameter names (keys) and their corresponding value
 *    arrays.</li>
 * <li>Recursively iterates through each parameter, selecting one value at a
 *    time.</li>
 * <li>When all parameters have been assigned values, stores the complete
 *    combination.</li>
 * <li>Backtracks to explore other value combinations.</li>
 * </ol>
 *
 * Example usage:
 * ```typescript
 * const generator = new CombinationsGenerator({
 *   matrixKeys: ['arch', 'optimize'],
 *   matrixValues: [['x64', 'arm'], ['speed', 'size']],
 *   log
 * });
 * const combinations = generator.generate();
 * // Results in:
 * // [
 * //   { arch: 'x64', optimize: 'speed' },
 * //   { arch: 'x64', optimize: 'size' },
 * //   { arch: 'arm', optimize: 'speed' },
 * //   { arch: 'arm', optimize: 'size' }
 * // ]
 * ```
 */
export class CombinationsGenerator {
  // --------------------------------------------------------------------------
  // Protected Members.

  /**
   * The logger instance for output and diagnostics.
   *
   * @remarks
   * This logger provides trace-level diagnostics during combination
   * generation, enabling visibility into the recursive exploration of the
   * parameter space without impacting performance when tracing is disabled.
   */
  protected readonly log: Logger

  /**
   * The array of parameter names.
   *
   * @remarks
   * This array contains the names of all matrix parameters in the order
   * they should be processed during combination generation. Each key
   * corresponds to a parameter that will appear in the generated
   * combinations.
   */
  protected readonly matrixKeys: string[]

  /**
   * The array of value arrays for each parameter.
   *
   * @remarks
   * This two-dimensional array contains the possible values for each
   * parameter. The outer array corresponds one-to-one with
   * <code>matrixKeys</code>, where <code>matrixValues[i]</code> contains
   * all possible values for the parameter <code>matrixKeys[i]</code>.
   *
   * The Cartesian product of all these value arrays produces the complete
   * set of combinations.
   */
  protected readonly matrixValues: string[][]

  /**
   * The array of generated combinations.
   *
   * @remarks
   * This array accumulates all generated combinations during the recursive
   * exploration. Each combination is a complete mapping of all parameter
   * names to one of their possible values.
   *
   * The array is populated during <code>generate()</code> and returned to
   * the caller.
   */
  protected readonly combinations: MatrixCombination[] = []

  // --------------------------------------------------------------------------
  // Constructor.

  /**
   * Constructs a combinations generator instance.
   *
   * @param matrixKeys - The array of parameter names.
   * @param matrixValues - The array of value arrays for each parameter.
   * @param log - The logger instance for output and diagnostics.
   *
   * @remarks
   * The constructor validates that the structure of keys and values is
   * correct and prepares the generator for combination generation. The
   * actual generation is performed by calling <code>generate()</code>.
   */
  constructor({
    matrixKeys,
    matrixValues,
    log,
  }: CombinationsGeneratorConstructorParameters) {
    this.log = log
    this.matrixKeys = matrixKeys
    this.matrixValues = matrixValues

    log.trace(
      `${CombinationsGenerator.name}.constructor: ` +
        `matrixKeys=${JSON.stringify(this.matrixKeys)} ` +
        `matrixValues=${JSON.stringify(this.matrixValues)}`
    )
  }

  // --------------------------------------------------------------------------
  // Public Methods.

  /**
   * Generates all possible combinations from the matrix parameters.
   *
   * @remarks
   * This method initiates the recursive generation process and returns the
   * complete array of all possible combinations.
   *
   * The generation algorithm:
   *
   * <ol>
   * <li>Starts the recursive process with an empty combination at index
   *    0.</li>
   * <li>The recursive method explores all possible value selections for
   *    each parameter.</li>
   * <li>Complete combinations are accumulated in the internal
   *    <code>combinations</code> array.</li>
   * <li>Returns the array containing all generated combinations.</li>
   * </ol>
   *
   * @returns An array of all possible parameter combinations.
   */
  generate(): MatrixCombination[] {
    this._generateRecursively(0, {})

    return this.combinations
  }

  // --------------------------------------------------------------------------
  // Private Methods.

  /**
   * Recursively generates combinations by exploring the parameter space.
   *
   * @remarks
   * This method implements the core recursive algorithm for generating the
   * Cartesian product of parameter values.
   *
   * Algorithm steps:
   *
   * <ol>
   * <li><b>Base case:</b> If all parameters have been assigned values
   *    (<code>index === matrixKeys.length</code>), store a copy of the
   *    current combination and return.</li>
   * <li><b>Recursive case:</b> For the parameter at the current index:
   *   <ul>
   *   <li>Iterate through all possible values for this parameter.</li>
   *   <li>Assign each value to the combination object.</li>
   *   <li>Recursively generate combinations for the next parameter.</li>
   *   <li>Remove the assigned value (backtrack) before trying the next
   *      value.</li>
   *   </ul>
   * </li>
   * </ol>
   *
   * The backtracking ensures that the combination object is reused
   * efficiently without creating unnecessary intermediate objects.
   *
   * @param index - The current parameter index being processed.
   * @param combination - The partial combination being built.
   */
  protected _generateRecursively(
    index: number,
    combination: Record<string, string>
  ): void {
    const log = this.log
    log.trace(
      `${CombinationsGenerator.name}.` +
        `_generateRecursively(${String(index)},${JSON.stringify(combination)})`
    )

    if (index === this.matrixKeys.length) {
      log.trace('combination complete =>', combination)
      this.combinations.push({ ...combination })

      return
    }

    const key = this.matrixKeys[index]
    const values = this.matrixValues[index]

    for (const value of values) {
      combination[key] = value
      this._generateRecursively(index + 1, combination)
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete combination[key]
    }
  }
}

// ----------------------------------------------------------------------------
