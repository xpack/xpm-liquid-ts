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

import { Logger } from '@xpack/logger'

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

export type JsonActionStrings = string | string[]

export interface JsonActionTemplate {
  matrix: Record<string, string[]>
  template: JsonActionStrings
}

export type JsonActionValue = JsonActionStrings | JsonActionTemplate

export type JsonPropertyValue = string

export type JsonProperties = Record<string, JsonPropertyValue>

export type JsonBuildConfigurationInherits = string[]

export type JsonActions = Record<string, JsonActionValue>

export type JsonScripts = Record<string, string>

export type JsonDependencies = Record<string, string | JsonDependencyExtended>

export type JsonDependencyExtended = Record<string, string>

export interface JsonBuildConfiguration {
  inherits?: JsonBuildConfigurationInherits | string
  inherit?: JsonBuildConfigurationInherits | string // Deprecated
  hidden?: boolean
  properties?: JsonProperties
  actions?: JsonActions
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
}

export type JsonBuildConfigurations = Record<string, JsonBuildConfiguration>

export interface JsonXpack {
  minimumXpmRequired?: string
  binaries?: JsonXpmBinaries
  executables?: Record<string, string>
  bin?: Record<string, string> // Deprecated
  properties?: JsonProperties
  actions?: JsonActions
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
  buildConfigurations?: JsonBuildConfigurations
}

export type JsonXpmBinariesPlatforms = Record<string, JsonXpmPlatformFile>

export interface JsonXpmBinaries {
  destination: string
  baseUrl: string
  skip?: number
  platforms: JsonXpmBinariesPlatforms
}

export interface JsonXpmPlatformFile {
  fileName: string
  sha256?: string
  sha512?: string
  baseUrl?: string
  skip?: number
}

export interface JsonNpmPackage {
  name?: string
  version?: string
  scripts?: JsonScripts
  bin?: Record<string, string> | string
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow any additional property
}

export interface JsonXpmPackage extends JsonNpmPackage {
  xpack: JsonXpack
}

// ----------------------------------------------------------------------------

export type XpmLiquidActionCommands = string[] // Always array of strings.

export interface XpmConfig {
  doForce?: boolean
  doSkipIfInstalled?: boolean
  isDryRun?: boolean
  properties?: Record<string, string | boolean | number>
  [key: string]: unknown // Allow any additional property
}

export interface XpmContext {
  log: Logger
  config: XpmConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow any additional property
}

// ----------------------------------------------------------------------------
