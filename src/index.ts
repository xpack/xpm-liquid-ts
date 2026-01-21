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
 * A Node.js TypeScript module with the core code for xpm and xpm enabled
 * projects.
 *
 * @remarks
 * This library groups together various classes and functions used in common
 * by xpm and the Visual Studio Code extension.
 *
 * The main functionality is to manage actions and build configurations,
 * especially those defined using Liquid templates.
 *
 * The Lazy Evaluation Mechanism
 *
 * Actions ({@link XpmLiquidActions}) and build configurations
 * ({@link XpmLiquidBuildConfigurations}) implement a two-step lazy evaluation
 * process to avoid unnecessary operations:
 *
 * 1. Name Expansion: During collection initialisation, only the matrix of
 *    options is evaluated for each template, expanding template names into
 *    concrete action or configuration names without processing their content.
 *
 * 2. Content Evaluation: Later, when an action or build configuration is
 *    actually accessed and initialised (via {@link XpmLiquidAction.initialise}
 *    or {@link XpmLiquidBuildConfiguration.initialise}), the template is fully
 *    evaluated and Liquid substitutions are performed.
 *
 * This approach ensures that only items that are actually used incur the cost
 * of template evaluation and variable substitution, significantly improving
 * performance for projects with many actions or configurations.
 *
 * @packageDocumentation
 */

// ----------------------------------------------------------------------------

// Public entry point for the xpm-lib TypeScript library.
export * from './functions/chmod-recursive.js'
export * from './functions/filter-paths.js'
export * from './functions/is-something.js'
export * from './functions/perform-substitutions.js'
export * from './functions/utils.js'

export * from './classes/errors.js'
export * from './classes/init-template-base.js'
export * from './classes/liquid-actions.js'
export * from './classes/liquid-build-configurations.js'
export * from './classes/liquid-drop.js'
export * from './classes/liquid-engine.js'
export * from './classes/liquid-package.js'
export * from './classes/package.js'
export * from './classes/policies.js'

export * from './data/substitutions-variables.js'

export * from './types/json.js'
export * from './types/xpm-init-template.js'
export * from './types/xpm.js'

// ----------------------------------------------------------------------------

// Re-export liquidjs to the application to ensure consistent versions.
export * from 'liquidjs'

// ----------------------------------------------------------------------------
