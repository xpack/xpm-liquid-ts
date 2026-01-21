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
 * Represents a JSON property value.
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonPropertyValue = any

/**
 * Represents a JSON map of properties.
 *
 * @public
 */
export type JsonProperties = Record<string, JsonPropertyValue>

/**
 * Represents a JSON array of build configuration names to inherit from.
 *
 * @public
 */
export type JsonBuildConfigurationInherits = string[]

/**
 * Represents a JSON map of npm scripts.
 *
 * @public
 */
export type JsonScripts = Record<string, string>

/**
 * Represents a JSON map of dependencies.
 *
 * @public
 */
export type JsonDependencies = Record<string, JsonDependenciesContent>

/**
 * Represents a JSON dependency content as a string or extended definition.
 *
 * @public
 */
export type JsonDependenciesContent = string | JsonDependencyExtended

/**
 * Represents a JSON extended dependency definition.
 *
 * @remarks
 * Extended dependency format introduced in xpm 0.16.0 to support richer
 * dependency metadata beyond simple version strings. Allows specifying
 * platform constraints and local installation modes.
 *
 * Example usage in package.json:
 * ```json
 * "dependencies": {
 *   "@scope/package": {
 *     "specifier": "^1.0.0",
 *     "platforms": ["linux-x64", "darwin-x64"],
 *     "local": "link"
 *   }
 * }
 * ```
 *
 * Platform filtering enables platform-specific dependencies, useful for
 * binary packages that only work on certain operating systems or
 * architectures. Local installation modes control how dependencies are
 * installed in the workspace (symbolic link vs. file copy).
 *
 * @public
 */
export interface JsonDependencyExtended {
  /**
   * The dependency version specifier.
   *
   * @public
   */
  specifier: string
  /**
   * The local installation mode, if applicable.
   *
   * @public
   */
  local?: 'link' | 'copy'
  /**
   * The supported platforms for the dependency.
   *
   * @public
   */
  platforms?: string | string[]
}

// ----------------------------------------------------------------------------

/**
 * Represents a JSON action content as a string or string array.
 *
 * @public
 */
export type JsonActionContent = string | string[]

/**
 * Represents a JSON template action with a matrix for expansion.
 *
 * @remarks
 * Template actions use matrix parameters to generate multiple action
 * variants from a single definition via Cartesian product expansion. This
 * enables creating platform-specific or configuration-specific actions
 * without duplication.
 *
 * Example usage in package.json:
 * ```json
 * "actions": {
 *   "build-{{ matrix.platform }}": {
 *     "matrix": {
 *       "platform": ["linux", "darwin", "win32"]
 *     },
 *     "template": "make build PLATFORM={{ matrix.platform }}"
 *   }
 * }
 * ```
 *
 * This generates three actions: build-linux, build-darwin, and build-win32.
 * Matrix values are accessible in both the action name and template content
 * via `{{ matrix.key }}` Liquid syntax.
 *
 * @public
 */
export interface JsonActionTemplate {
  /**
   * The matrix of parameters used to generate action variants.
   *
   * @public
   */
  matrix: Record<string, string[]>
  /**
   * The action template content.
   *
   * @public
   */
  template: JsonActionContent
}

/**
 * Represents a JSON action definition or a template of one.
 *
 * @public
 */
export type JsonAction = JsonActionContent | JsonActionTemplate

/**
 * Represents a JSON map of action definitions.
 *
 * @public
 */
export type JsonActions = Record<string, JsonAction>

// ----------------------------------------------------------------------------

/**
 * Represents a JSON build configuration definition.
 *
 * @public
 */
export interface JsonBuildConfigurationContent {
  /**
   * The configurations to inherit from.
   *
   * @public
   */
  inherits?: JsonBuildConfigurationInherits | string
  /**
   * Deprecated alias of {@link JsonBuildConfigurationContent.inherits}.
   *
   * @public
   */
  inherit?: JsonBuildConfigurationInherits | string // Deprecated, use inherits
  /**
   * Whether the configuration should be hidden.
   *
   * @public
   */
  hidden?: boolean
  /**
   * The properties map for substitutions.
   *
   * @public
   */
  properties?: JsonProperties
  /**
   * The action definitions for this configuration.
   *
   * @public
   */
  actions?: JsonActions
  /**
   * The dependencies for this configuration.
   *
   * @public
   */
  dependencies?: JsonDependencies
  /**
   * The development dependencies for this configuration.
   *
   * @public
   */
  devDependencies?: JsonDependencies
}

/**
 * Represents a JSON template build configuration with matrix expansion.
 *
 * @remarks
 * Template build configurations use matrix parameters to generate multiple
 * configuration variants from a single definition via Cartesian product
 * expansion. Common for cross-compilation scenarios where multiple
 * architecture or platform combinations are needed.
 *
 * Example usage in package.json:
 * ```json
 * "buildConfigurations": {
 *   "{{ matrix.os }}-{{ matrix.arch }}": {
 *     "matrix": {
 *       "os": ["linux", "darwin"],
 *       "arch": ["x64", "arm64"]
 *     },
 *     "template": {
 *       "properties": {
 *         "target": "{{ matrix.os }}-{{ matrix.arch }}"
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * This generates four configurations: linux-x64, linux-arm64, darwin-x64,
 * and darwin-arm64, each with matrix values available for property
 * substitution.
 *
 * @public
 */
export interface JsonBuildConfigurationTemplate {
  /**
   * The matrix of parameters used to generate configuration variants.
   *
   * @public
   */
  matrix: Record<string, string[]>
  /**
   * The configuration template content.
   *
   * @public
   */
  template: JsonBuildConfigurationContent
}

/**
 * Represents a JSON build configuration definition or a template of one.
 *
 * @public
 */
export type JsonBuildConfiguration =
  | JsonBuildConfigurationContent
  | JsonBuildConfigurationTemplate

/**
 * Represents a JSON map of build configuration definitions.
 *
 * @public
 */
export type JsonBuildConfigurations = Record<string, JsonBuildConfiguration>

// ----------------------------------------------------------------------------

/**
 * Represents a JSON xpm-specific section in package.json.
 *
 * @remarks
 * The xpack section extends standard npm package.json with xpm-specific
 * metadata for binary package management, build automation, and
 * cross-platform development workflows.
 *
 * Key capabilities:
 *
 * - Binary packages: Define platform-specific binary distributions with
 *   download URLs, checksums, and installation configuration.
 *
 * - Build configurations: Organize multiple build targets (debug, release,
 *   platform variants) with inherited properties and dependencies.
 *
 * - Actions: Define build automation commands that can reference
 *   properties and build configuration context via Liquid templates.
 *
 * - Properties: User-defined configuration values accessible throughout
 *   the package via template substitution.
 *
 * - Version requirements: Specify minimum xpm version for feature
 *   compatibility and policy enforcement.
 *
 * The xpack section is optional in npm packages but required for packages
 * using xpm-specific features like build configurations or binary
 * distributions.
 *
 * @public
 */
export interface JsonXpack {
  /**
   * The minimum required xpm version.
   *
   * @public
   */
  minimumXpmRequired?: string
  /**
   * The binaries definition, if the package provides binaries.
   *
   * @public
   */
  binaries?: JsonXpmBinaries
  /**
   * The executables map.
   *
   * @public
   */
  executables?: Record<string, string>
  /**
   * Deprecated alias of {@link JsonXpack.executables}.
   *
   * @public
   */
  bin?: Record<string, string> // Deprecated, use executables
  /**
   * The dependencies map.
   *
   * @public
   */
  dependencies?: JsonDependencies
  /**
   * The development dependencies map.
   *
   * @public
   */
  devDependencies?: JsonDependencies
  /**
   * The properties map.
   *
   * @public
   */
  properties?: JsonProperties
  /**
   * The action definitions.
   *
   * @public
   */
  actions?: JsonActions
  /**
   * The build configurations map.
   *
   * @public
   */
  buildConfigurations?: JsonBuildConfigurations
}

/**
 * Represents a JSON map of binaries platforms.
 *
 * @public
 */
export type JsonXpmBinariesPlatforms = Record<string, JsonXpmPlatformFile>

/**
 * Represents a JSON binaries definition in package.json.
 *
 * @remarks
 * Configures binary package distribution for tools, SDKs, or compiled
 * applications. xpm downloads platform-specific archives, verifies their
 * integrity, and extracts them to the specified destination.
 *
 * Example usage in package.json:
 * ```json
 * "binaries": {
 *   "destination": ".content",
 *   "baseUrl": "https://github.com/org/repo/releases/download/v1.0.0",
 *   "skip": 1,
 *   "platforms": {
 *     "linux-x64": {
 *       "fileName": "tool-linux-x64.tar.gz",
 *       "sha256": "abc123..."
 *     }
 *   }
 * }
 * ```
 *
 * The skip parameter removes leading path segments from archive entries
 * during extraction, useful for archives with wrapper folders. Checksums
 * ensure downloaded files haven't been corrupted or tampered with.
 *
 * @public
 */
export interface JsonXpmBinaries {
  /**
   * The destination folder for extracted binaries.
   *
   * @public
   */
  destination: string
  /**
   * The base URL used to download binaries.
   *
   * @public
   */
  baseUrl: string
  /**
   * The number of path segments to skip when extracting.
   *
   * @public
   */
  skip?: number
  /**
   * The platforms map for available binaries.
   *
   * @public
   */
  platforms: JsonXpmBinariesPlatforms
}

/**
 * Represents a JSON platform-specific binary file definition.
 *
 * @public
 */
export interface JsonXpmPlatformFile {
  /**
   * The binary archive file name.
   *
   * @public
   */
  fileName: string
  /**
   * The SHA-256 checksum for integrity verification.
   *
   * @public
   */
  sha256?: string
  /**
   * The SHA-512 checksum for integrity verification.
   *
   * @public
   */
  sha512?: string
  /**
   * Optional base URL override for this platform.
   *
   * @public
   */
  baseUrl?: string
  /**
   * The number of path segments to skip when extracting.
   *
   * @public
   */
  skip?: number
}

/**
 * Represents a JSON npm package.json structure.
 *
 * @public
 */
export interface JsonNpmPackage {
  /**
   * The package name.
   *
   * @public
   */
  name?: string
  /**
   * The package version.
   *
   * @public
   */
  version?: string
  /**
   * The npm scripts map.
   *
   * @public
   */
  scripts?: JsonScripts
  /**
   * The binary entry points.
   *
   * @public
   */
  bin?: Record<string, string> | string
  /**
   * The dependencies map.
   *
   * @public
   */
  dependencies?: JsonDependencies
  /**
   * The development dependencies map.
   *
   * @public
   */
  devDependencies?: JsonDependencies

  /**
   * Allows additional package.json properties.
   *
   * @public
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow any additional property
}

/**
 * Represents a JSON xpm package.json structure.
 *
 * @remarks
 * Combines standard npm package.json properties with xpm-specific
 * extensions via the required xpack section. All xpm packages are valid
 * npm packages, but not all npm packages are xpm packages.
 *
 * An xpm package can be:
 *
 * - A source package: Contains code, build configurations, and actions.
 *
 * - A binary package: Distributes pre-built binaries for multiple
 *   platforms with automated installation.
 *
 * - A library package: Provides reusable code or resources for other
 *   packages.
 *
 * - A tool package: Provides command-line tools or build utilities.
 *
 * The presence of the xpack section enables xpm-specific features like
 * template-based build configurations, matrix expansion, property
 * substitution, and platform-specific binary distribution. Standard npm
 * fields (name, version, dependencies, etc.) are used for package
 * identification and dependency management.
 *
 * @public
 */
export interface JsonXpmPackage extends JsonNpmPackage {
  /**
   * The xpm-specific configuration section.
   *
   * @public
   */
  xpack: JsonXpack
}

// ----------------------------------------------------------------------------

/**
 * Represents a JSON npm package specifier.
 *
 * @public
 */
export interface JsonPackageSpecifier {
  /**
   * The package scope, if present.
   *
   * @public
   */
  scope?: string
  /**
   * The package name.
   *
   * @public
   */
  name?: string
  /**
   * The version specifier, if present.
   *
   * @public
   */
  version?: string
}

// ----------------------------------------------------------------------------
