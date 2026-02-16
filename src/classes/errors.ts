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

// ============================================================================

// JavaScript provides the following standard error types:
//
// - Error: The base error type for all errors.
// - EvalError: An error regarding the global eval() function.
// - RangeError: An error when a value is not in the set or range of
//   allowed values.
// - ReferenceError: An error when an invalid reference is made.
// - SyntaxError: An error when trying to interpret syntactically
//   invalid code.
// - TypeError: An error when a value is not of the expected type.
// - URIError: An error when encodeURI() or decodeURI() functions are
//   used incorrectly.

/**
 * Error indicating a syntax error in configuration or template files.
 *
 * @remarks
 * This error is thrown when parsing JSON files.
 * This typically occurs during the parsing phase before semantic
 * validation. Use this error when the structure of the input is
 * malformed, as opposed to {@link InputError} or
 * {@link ConfigurationError} which indicate
 * semantically invalid but syntactically correct input.
 */
export class JsonSyntaxError extends Error {}

/**
 * Error indicating that required prerequisites are not met.
 *
 * @remarks
 * This error is thrown when dependencies, tools, or system requirements
 * necessary for an operation are missing or incompatible. Common scenarios
 * include missing npm packages, unavailable system tools, unsupported
 * platform versions, or insufficient <b>xpm</b> version requirements. Use this
 * error when validation of the execution environment fails before
 * attempting an operation.
 */
export class PrerequisitesError extends Error {}

/**
 * Error indicating a configuration issue.
 *
 * @remarks
 * This error is thrown when configuration files, such as `package.json`,
 * contain invalid values, missing required fields, circular references, or
 * other issues that prevent proper initialization or execution. Use this error
 * whenthe problem is related to the content of configuration files rather than
 * user input or output generation.
 */
export class ConfigurationError extends Error {}

/**
 * Error indicating a template evaluation failure.
 *
 * @remarks
 * This error is thrown when Liquid template rendering fails during output
 * generation. Common scenarios include undefined variables in templates,
 * invalid filter usage, template syntax errors caught during evaluation,
 * circular template references, or template size limit exceeded. This differs
 * from {@link ConfigurationError} which indicates issues in the template
 * configuration structure itself, and {@link OutputError} which indicates
 * file system or broader output failures.
 */
export class TemplateError extends Error {}

/**
 * Error indicating that user input is invalid.
 *
 * @remarks
 * This error is thrown when command-line arguments,
 * or other user-provided input fails validation. Common scenarios
 * include invalid property values, missing required fields,
 * out-of-range parameter values, missing files or directories, or other
 * issues that prevent proper execution. The error message should clearly
 * indicate what input was invalid and why, helping users correct their
 * configuration or arguments.
 */
export class InputError extends Error {}

/**
 * Error indicating a failure during output generation.
 *
 * @remarks
 * This error is thrown when file generation, Liquid template rendering,
 * or other output operations fail. Common scenarios include template
 * evaluation errors, file system write failures, or variable substitution
 * problems. This error indicates that the input was valid but the
 * transformation or output process encountered a problem during execution.
 */
export class OutputError extends Error {}

// ----------------------------------------------------------------------------
