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

/**
 * Represents a map of `xpm init` template property definitions.
 *
 * @remarks
 * Template properties define the interactive configuration interface for
 * `xpm init` command, allowing templates to collect user input before
 * generating project files.
 *
 * Each property key becomes accessible in template files via Liquid syntax
 * as `{{ properties.key }}`. Property definitions control the prompt type,
 * validation, default values, and available options.
 *
 * Example usage in template metadata:
 * ```json
 * {
 *   language: {
 *     label: 'Programming language',
 *     description: 'Select the preferred programming language',
 *     type: 'select',
 *     items: {
 *       c: 'C for the application files',
 *       cpp: 'C++ for the application files'
 *     },
 *     default: 'cpp',
 *     isMandatory: true
 *   }
 * }
 * ```
 *
 * @public
 */
export type XpmInitTemplatePropertiesDefinitions = Record<
  string,
  XpmInitTemplatePropertiesDefinition
>

/**
 * Defines an `xpm init` single template property.
 *
 * @remarks
 * Property definitions control how users are prompted for template
 * configuration values during `xpm init` execution.
 *
 * Property types:
 *
 * - `select`: Present a list of options for the user to choose from.
 *   Requires `items` to be populated with available choices.
 *
 * - `string`: Accept free-form text input from the user.
 *
 * - `number`: Accept numeric input with validation.
 *
 * - `boolean`: Accept yes/no input (typically true/false).
 *
 * Platform filtering: For `select` types, items can specify platform
 * constraints via `XpmInitTemplateItemValue`, hiding options that
 * don't match the current platform. This enables platform-specific
 * configuration without manual filtering.
 *
 * Mandatory properties without defaults will block template initialization
 * until the user provides a value. Optional properties with defaults use
 * the default when the user skips the prompt.
 *
 * @public
 */
export interface XpmInitTemplatePropertiesDefinition {
  /**
   * The human-readable label used in prompts.
   *
   * @public
   */
  label: string
  /**
   * The description shown when the user requests help.
   *
   * @public
   */
  description: string
  /**
   * The property value type.
   *
   * @public
   */
  type: 'select' | 'string' | 'number' | 'boolean'
  /**
   * The selectable items for a `select` property.
   *
   * @public
   */
  items: Record<string, string | XpmInitTemplateItemValue>
  /**
   * Indicates whether the property is mandatory.
   *
   * @public
   */
  isMandatory?: boolean
  /**
   * The default value for the property.
   *
   * @public
   */
  default?: string | number | boolean
}

/**
 * Represents the supported platform identifiers for `xpm init` template items.
 *
 * @remarks
 * Platform identifiers filter select items based on the current execution
 * environment, allowing templates to show only relevant options.
 *
 * Platform matching strategy:
 *
 * - Generic platforms (linux, win32, darwin) match any architecture on that
 *   operating system.
 *
 * - Specific platforms (linux-x64, darwin-arm64, etc.) match only the exact
 *   OS and architecture combination.
 *
 * Example: An item with `platforms: ["darwin-arm64"]` only appears when
 * running on Apple Silicon Macs, while `platforms: ["darwin"]` appears on
 * both Intel and ARM Macs.
 *
 * Common use case: Offering different toolchain options based on whether
 * the user is on Windows, macOS Intel, macOS ARM, or Linux.
 *
 * @public
 */
export type XpmInitTemplatePlatform =
  | 'linux'
  | 'linux-x64'
  | 'linux-arm64'
  | 'win32'
  | 'darwin'
  | 'darwin-x64'
  | 'darwin-arm64'

/**
 * Defines an `xpm init` template platform-specific item value.
 *
 * @remarks
 * Platform-specific items allow select properties to offer different
 * options based on the user's operating system and architecture. Only items
 * matching the current platform are shown to the user.
 *
 * Example usage in property definition:
 * ```js
 * {
 *   toolchain: {
 *     label: 'Toolchain',
 *     description: 'Select the toolchain to be used by the builds',
 *     type: 'select',
 *     items: {
 *       gcc: {
 *         // There is no gcc on macOS.
 *         platforms: ['linux', 'win32'],
 *         message: 'The xPack GNU Compiler Collection (GCC) toolchain'
 *       },
 *       clang: 'The xPack LLVM clang toolchain',
 *       system: {
 *         // There is no system toolchain on Windows.
 *         platforms: ['linux', 'darwin'],
 *         message: 'The system toolchain'
 *       }
 *     },
 *     default: 'clang'
 *   }
 * }
 * ```
 *
 * When running on Windows, only the "msvc" option appears. On Linux or
 * macOS Intel, only "gcc-arm" appears.
 *
 * @public
 */
export interface XpmInitTemplateItemValue {
  /**
   * The list of supported platforms.
   *
   * @public
   */
  platforms: XpmInitTemplatePlatform[]
  /**
   * The description message for this item.
   *
   * @public
   */
  message: string
}

/**
 * Defines the substitution variables used by `xpm init` templates.
 *
 * @remarks
 * Substitution variables provide the context for Liquid template processing
 * during project initialization. All collected property values and
 * additional template-specific variables are accessible in template files.
 *
 * Variable structure:
 *
 * - `properties`: Contains all user-provided or default values from the
 *   template property definitions, accessible via
 *   `{{ properties.propertyName }}` in template files.
 *
 * - Additional variables: Templates can define custom variables for reuse
 *   across multiple files or for computed values based on properties.
 *
 * Template files (with `.liquid` extension or configured patterns) are
 * processed with this context, allowing conditional content, loops, and
 * value substitution. Non-template files are copied as-is without
 * processing.
 *
 * Example template usage:
 * ```
 * Project name: {{ properties.name }}
 * {% if properties.language == "cpp" %}
 * Language: C++
 * {% endif %}
 * ```
 *
 * @public
 */
export interface XpmInitTemplateSubstitutionsVariables {
  /**
   * The resolved template properties.
   *
   * @public
   */
  properties: Record<string, string | boolean | number>
  /**
   * Additional template variables.
   *
   * @public
   */
  [key: string]: unknown
}

// ----------------------------------------------------------------------------
