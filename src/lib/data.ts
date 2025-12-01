/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021-2025 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

export type JsonActionValue = string | string[]

export type JsonPropertyValue = string

export type JsonProperties = Record<string, JsonPropertyValue>

export type JsonBuildConfigurationInherits = Record<string, string>

export type JsonActions = Record<string, JsonActionValue>

export type JsonScripts = Record<string, string>

export type JsonDependencies = Record<string, string>

export interface JsonBuildConfiguration {
  inherit?: JsonBuildConfigurationInherits | string
  hidden?: boolean
  properties?: JsonProperties
  actions?: JsonActions
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
}

export type JsonBuildConfigurations = Record<string, JsonBuildConfiguration>

export interface JsonXpack {
  properties?: JsonProperties
  actions?: JsonActions
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
  buildConfigurations?: JsonBuildConfigurations
}

export interface JsonNpmPackage {
  name?: string
  version?: string
  scripts?: JsonScripts
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow any additional property
}


export interface JsonXpmPackage extends JsonNpmPackage {
  xpack: JsonXpack
}

export class XpmLiquidData {
  

}

// ----------------------------------------------------------------------------
