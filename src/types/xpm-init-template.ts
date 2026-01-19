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

export type XpmInitTemplatePropertiesDefinitions = Record<
  string,
  XpmInitTemplatePropertiesDefinition
>

export interface XpmInitTemplatePropertiesDefinition {
  label: string
  description: string
  type: 'select' | 'string' | 'number' | 'boolean'
  items: Record<string, string | XpmInitTemplateItemValue>
  isMandatory?: boolean
  default?: string | number | boolean
}

export type XpmInitTemplatePlatform =
  | 'linux'
  | 'linux-x64'
  | 'linux-arm64'
  | 'win32'
  | 'darwin'
  | 'darwin-x64'
  | 'darwin-arm64'

export interface XpmInitTemplateItemValue {
  platforms: XpmInitTemplatePlatform[]
  message: string
}

export interface XpmInitTemplateSubstitutionsVariables {
  properties: Record<string, string | boolean | number>
  [key: string]: unknown
}

// ----------------------------------------------------------------------------
