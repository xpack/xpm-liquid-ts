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

/**
 * A Node.js TypeScript module with the core code for <b>xpm</b> and
 * <b>xpm enabled</b> projects.
 *
 * @remarks
 * This library groups together various classes and functions used in common
 * by <b>xpm</b> and the Visual Studio Code extension.
 *
 * The main functionality is to manage actions and build configurations,
 * especially those defined using Liquid templates.
 *
 * <h3>The Lazy Evaluation Mechanism</h3>
 *
 * Actions ({@link Actions}) and build configurations
 * ({@link BuildConfigurations}) implement a two-step lazy evaluation
 * process to avoid unnecessary operations:
 *
 * <ol>
 * <li><b>Name Expansion:</b> During collection initialisation, only
 *    the matrix of
 *    options is evaluated for each template, expanding template names into
 *    concrete action or configuration names without processing their
 * content.</li>
 * <li><b>Content Evaluation:</b> Later, when an action or build
 *    configuration is  actually accessed and initialised (via
 *    <code>Action.initialise()</code>
 *    or <code>BuildConfiguration.initialise()</code>), the template
 *    is fully
 *    evaluated and Liquid substitutions are performed.</li>
 * </ol>
 *
 * This approach ensures that only items that are actually used incur the cost
 * of template evaluation and variable substitution, significantly improving
 * performance for projects with many actions or configurations.
 *
 * @packageDocumentation
 */

// ----------------------------------------------------------------------------

// Public entry point for the xpm-lib TypeScript library.
export * from './functions/chmod-recursively.js'
export * from './functions/filter-paths.js'
export * from './functions/is-something.js'
export * from './functions/matrix-expander.js'
export * from './functions/perform-substitutions.js'
export * from './functions/utils.js'

export * from './classes/errors.js'
export * from './classes/init-template-base.js'
export * from './classes/actions.js'
export * from './classes/build-configurations.js'
export * from './classes/combinations-generator.js'
export * from './classes/liquid-drop.js'
export * from './classes/liquid-engine.js'
export * from './classes/data-model.js'
export * from './classes/package.js'
export * from './classes/platform-detector.js'
export * from './classes/policies.js'
export * from './classes/template-expander.js'

export * from './data/substitutions-variables.js'

export * from './types/json.js'
export * from './types/xpm-init-template.js'
export * from './types/xpm.js'

// ----------------------------------------------------------------------------

// Note: liquidjs is not re-exported to avoid API Extractor conflicts.
// Consumers should import it directly: import { Liquid } from 'liquidjs'
// This ensures they use the same version as this library via peer dependencies.
// export * as liquidjs from 'liquidjs'

// ----------------------------------------------------------------------------
