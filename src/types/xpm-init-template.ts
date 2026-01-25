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
 * <ul>
 * <li><code>select</code>: Present a list of options for the user to
 *   choose from.
 *   Requires <code>items</code> to be populated with available choices.</li>
 * <li><code>string</code>: Accept free-form text input from the user.</li>
 * <li><code>number</code>: Accept numeric input with validation.</li>
 * <li><code>boolean</code>: Accept yes/no input (typically true/false).</li>
 * </ul>
 *
 * Platform filtering: For `select` types, items can specify platform
 * constraints via `XpmInitTemplateItemValue`, hiding options that
 * don't match the current platform. This enables platform-specific
 * configuration without manual filtering.
 *
 * Mandatory properties without defaults will block template initialization
 * until the user provides a value. Optional properties with defaults use
 * the default when the user skips the prompt.
 */
export interface XpmInitTemplatePropertiesDefinition {
  /**
   * The human-readable label used in prompts.
   */
  label: string
  /**
   * The description shown when the user requests help.
   */
  description: string
  /**
   * The property value type.
   */
  type: 'select' | 'string' | 'number' | 'boolean'
  /**
   * The selectable items for a `select` property.
   */
  items: Record<string, string | XpmInitTemplateItemValue>
  /**
   * Indicates whether the property is mandatory.
   */
  isMandatory?: boolean
  /**
   * The default value for the property.
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
 * <ul>
 * <li>Generic platforms (linux, win32, darwin) match any architecture on that
 *   operating system.</li>
 * <li>Specific platforms (linux-x64, darwin-arm64, etc.) match only the exact
 *   OS and architecture combination.</li>
 * </ul>
 *
 * Example: An item with `platforms: ["darwin-arm64"]` only appears when
 * running on Apple Silicon Macs, while `platforms: ["darwin"]` appears on
 * both Intel and ARM Macs.
 *
 * Common use case: Offering different toolchain options based on whether
 * the user is on Windows, macOS Intel, macOS ARM, or Linux.
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
 */
export interface XpmInitTemplateItemValue {
  /**
   * The list of supported platforms.
   */
  platforms: XpmInitTemplatePlatform[]
  /**
   * The description message for this item.
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
 * <ul>
 * <li><b><code>properties</code></b>: Contains all user-provided or 
 *    default values from the
 *    template property definitions, accessible via
 *    <code>\{\{ properties.propertyName \}\}</code> in template files.</li>
 * <li>Additional variables: Templates can define custom variables for reuse
 *    across multiple files or for computed values based on properties.</li>
 * </ul>
 *
 * Template files (with `.liquid` extension) are
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
 */
export interface XpmInitTemplateSubstitutionsVariables {
  /**
   * The resolved template properties.
   */
  properties: Record<string, string | boolean | number>
  /**
   * Additional template variables.
   */
  [key: string]: unknown
}

// ----------------------------------------------------------------------------
