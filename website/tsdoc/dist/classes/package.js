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
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
// https://www.npmjs.com/package/semver
import semver from 'semver';
import { XpmInputError, XpmPrerequisitesError } from './errors.js';
// ============================================================================
/**
 * Provides access to package metadata and xpm-specific validation.
 *
 * @remarks
 * This class loads and validates package.json content, determines
 * package capabilities, and provides helper methods used across xpm
 * workflows.
 *
 * The package abstraction provides a layer over package.json processing
 * with progressive validation:
 *
 * 1. Basic file I/O: Read and write package.json with error handling.
 *
 * 2. npm validation: Check for valid npm package structure (name, version).
 *
 * 3. xpm validation: Verify xpack section presence and structure.
 *
 * 4. Binary package validation: Validate binary-specific metadata
 *    (executables, binaries, platforms).
 *
 * 5. Capability detection: Determine package features (scripts, actions,
 *    build configurations).
 *
 * 6. Version checking: Validate minimum xpm version requirements.
 *
 * 7. Specifier parsing: Extract scope, name, and version from package
 *    identifiers.
 *
 * This hierarchy allows validation to be performed incrementally as needed,
 * avoiding unnecessary checks for packages that don't meet earlier criteria.
 *
 * @public
 */
export class XpmPackage {
    // --------------------------------------------------------------------------
    // Members.
    /**
     * The absolute path to the package folder.
     *
     * @remarks
     * This path serves as the base directory for all package operations,
     * including reading/writing package.json and resolving relative paths.
     *
     * Path requirements:
     *
     * 1. Must be an absolute path to a directory.
     *
     * 2. Directory should contain (or will contain) a package.json file.
     *
     * 3. Used to construct the path to package.json as
     *    `{packageFolderPath}/package.json`.
     *
     * 4. Remains constant throughout the lifecycle of the XpmPackage instance.
     *
     * The path is set during construction and used by all methods that access
     * or modify package.json.
     *
     * @public
     */
    packageFolderPath;
    /**
     * The parsed package.json content, when available.
     *
     * @remarks
     * This property caches the parsed package.json content after successful
     * reading, avoiding repeated file I/O and parsing operations.
     *
     * Lifecycle states:
     *
     * 1. Initially undefined when the XpmPackage instance is created.
     *
     * 2. Populated by {@link XpmPackage.readPackageDotJson} upon successful
     *    read andparse.
     *
     * 3. Cleared to undefined if parsing fails with `withThrow` enabled.
     *
     * 4. Used by validation methods (isNpmPackage, isXpmPackage,
     *    isBinaryXpmPackage) to check package capabilities.
     *
     * 5. Not automatically updated when package.json is modified externally;
     *    call {@link XpmPackage.readPackageDotJson} again to refresh.
     *
     * The cached content improves performance for packages that perform
     * multiple validation checks without file system access overhead.
     *
     * @public
     */
    jsonPackage;
    /**
     * The logger instance for output and diagnostics.
     *
     * @remarks
     * This logger provides trace-level diagnostics for package operations,
     * including file I/O, parsing, validation, and version checking.
     *
     * Logging use cases:
     *
     * 1. Trace package folder path during construction.
     *
     * 2. Log file read errors when investigating missing package.json.
     *
     * 3. Trace JSON parsing errors for debugging invalid package.json.
     *
     * 4. Log version validation details during minimumXpmRequired checks.
     *
     * 5. Trace package specifier parsing for debugging dependency
     *    resolution.
     *
     * The logger enables detailed diagnostics without affecting normal
     * operation, as trace-level output is typically disabled in production.
     *
     * @public
     */
    _log;
    // --------------------------------------------------------------------------
    // Constructor.
    /**
     * Constructs a package helper bound to a specific folder.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param packageFolderPath - The absolute path to the package folder.
     *
     * @public
     */
    constructor({ log, packageFolderPath, }) {
        this._log = log;
        this.packageFolderPath = packageFolderPath;
        log.trace(`${XpmPackage.name}(${packageFolderPath})`);
    }
    // --------------------------------------------------------------------------
    // Methods.
    /**
     * Reads and parses package.json from the package folder.
     *
     * @remarks
     * This method provides flexible error handling for scenarios where a
     * missing or invalid package.json may be expected (e.g., checking whether
     * a folder is a package) versus scenarios where it indicates a critical
     * error (e.g., operating on a known package).
     *
     * When `withThrow` is false, the method returns undefined for missing or
     * invalid files, allowing callers to handle the absence gracefully. When
     * `withThrow` is true, errors are thrown as {@link XpmInputError} for
     * consistent error handling across the application.
     *
     * @param withThrow - Whether to throw on missing or invalid package.json.
     * @returns The parsed package.json content, or undefined when missing or
     * invalid and `withThrow` is false.
     *
     * @throws {@link XpmInputError}
     * If package.json is missing or invalid and `withThrow` is true.
     *
     * @public
     */
    async readPackageDotJson({ withThrow = false, } = {}) {
        const jsonFilePath = path.join(this.packageFolderPath, 'package.json');
        let fileContent;
        try {
            fileContent = await fs.readFile(jsonFilePath);
        }
        catch (err) {
            if (withThrow) {
                if (err instanceof Error) {
                    this._log.trace(err.message);
                }
                throw new XpmInputError(`no package.json in folder ‘${this.packageFolderPath}’`);
            }
            else {
                return undefined;
            }
        }
        try {
            this.jsonPackage = JSON.parse(fileContent.toString());
        }
        catch (err) {
            if (withThrow) {
                this.jsonPackage = undefined;
                if (err instanceof Error) {
                    this._log.trace(err.message);
                }
                throw new XpmInputError(`invalid package.json in folder ‘${this.packageFolderPath}’`);
            }
            else {
                return undefined;
            }
        }
        return this.jsonPackage;
    }
    /**
     * Writes the provided package.json content to disk.
     *
     * @remarks
     * The JSON content is passed explicitly rather than using the cached
     * value.
     *
     * @param jsonPackage - The package.json content to write.
     * @returns A promise that resolves when the file has been written.
     *
     * @public
     */
    async rewritePackageDotJson(jsonPackage) {
        const log = this._log;
        assert(jsonPackage);
        const jsonString = JSON.stringify(jsonPackage, null, 2) + '\n';
        const jsonFilePath = path.join(this.packageFolderPath, 'package.json');
        log.trace(`write filePath: '${jsonFilePath}'`);
        await fs.writeFile(jsonFilePath, jsonString);
    }
    /**
     * Determines whether the package.json content represents a valid npm package.
     *
     * @returns `true` if the package has a valid name and version, `false`
     * otherwise.
     *
     * @public
     */
    isNpmPackage() {
        const jsonPackage = this.jsonPackage;
        if (jsonPackage?.name === undefined || jsonPackage.version === undefined) {
            return false;
        }
        const name = jsonPackage.name.trim();
        if (name.length === 0) {
            return false;
        }
        const version = jsonPackage.version.trim();
        if (version.length === 0) {
            return false;
        }
        return true;
    }
    /**
     * Determines whether the package is an xpm package.
     *
     * @returns `true` if the package is a valid npm package with an xpack
     * section, `false` otherwise.
     *
     * @public
     */
    isXpmPackage() {
        const jsonPackage = this.jsonPackage;
        if (!this.isNpmPackage()) {
            return false;
        }
        if (jsonPackage?.xpack === undefined) {
            return false;
        }
        return true;
    }
    /**
     * Determines whether the package is a binary xpm package.
     *
     * @remarks
     * Binary packages must have both executables and binaries. The
     * presence of one implies the other, so this method validates consistency.
     *
     * Validation rules:
     *
     * 1. If `xpack.executables` (or deprecated `xpack.bin`) exists, then
     *    `xpack.binaries` and `xpack.binaries.platforms` must also exist.
     *
     * 2. If `xpack.binaries` exists, then `xpack.binaries.platforms` and
     *    `xpack.executables` (or deprecated `xpack.bin`) must also exist.
     *
     * This bidirectional validation ensures package metadata consistency and
     * catches incomplete binary package configurations early. The check helps
     * prevent runtime errors when attempting to install or use binary packages
     * with missing metadata.
     *
     * @returns `true` if the package defines binaries and executables, `false`
     * otherwise.
     *
     * @throws {@link XpmInputError}
     * If required binary package fields are missing.
     *
     * @public
     */
    isBinaryXpmPackage() {
        const jsonPackage = this.jsonPackage;
        if (!this.isXpmPackage()) {
            return false;
        }
        // Since Nov. 2024, `executables` is preferred to `bin`.
        if (jsonPackage?.xpack.executables ?? jsonPackage?.xpack.bin) {
            // If it has `executables` or `bin`, it must have `binaries` and
            // `binaries.platforms` too.
            if (!jsonPackage.xpack.binaries) {
                throw new XpmInputError("doesn't look like a proper binary xpm package, " +
                    'package.json has no "xpack.binaries"');
            }
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!jsonPackage.xpack.binaries.platforms) {
                throw new XpmInputError("doesn't look like a proper binary xpm package, " +
                    'package.json has no "xpack.binaries.platforms"');
            }
            return true;
        }
        if (jsonPackage?.xpack.binaries) {
            // If it has `binaries`, it must have `binaries.platforms` and
            // `executables` too.
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!jsonPackage.xpack.binaries.platforms) {
                throw new XpmInputError("doesn't look like a proper binary xpm package, " +
                    'package.json has no "xpack.binaries.platforms"');
            }
            if (!(jsonPackage.xpack.executables ?? jsonPackage.xpack.bin)) {
                throw new XpmInputError("doesn't look like a proper binary xpm package, " +
                    'package.json has no "xpack.executables"');
            }
            return true;
        }
        return false;
    }
    /**
     * Determines whether the package is a Node module without xpm metadata.
     *
     * @returns `true` if the package is a Node module without xpm metadata,
     * `false` otherwise.
     *
     * @public
     */
    isNodeModule() {
        const jsonPackage = this.jsonPackage;
        return !!jsonPackage && !jsonPackage.xpack;
    }
    /**
     * Determines whether the package is a Node module with a binary entry.
     *
     * @returns `true` if the package is a Node module with a bin entry,
     * `false` otherwise.
     *
     * @public
     */
    isBinaryNodeModule() {
        const jsonPackage = this.jsonPackage;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return this.isNodeModule() && !!jsonPackage?.bin;
    }
    /**
     * Determines whether the package defines any npm scripts.
     *
     * @returns `true` if at least one script is defined, `false` otherwise.
     *
     * @public
     */
    hasNpmScripts() {
        const jsonPackage = this.jsonPackage;
        if (jsonPackage?.scripts !== undefined &&
            Object.keys(jsonPackage.scripts).length > 0) {
            return true;
        }
        return false;
    }
    /**
     * Determines whether the package defines any xpm actions.
     *
     * @remarks
     * This method performs a comprehensive search for action definitions at
     * both the package level and within build configurations, including
     * template-based configurations.
     *
     * Action detection strategy:
     *
     * 1. Check for package-level actions in `xpack.actions`.
     *
     * 2. If no package-level actions, iterate through all build
     *    configurations.
     *
     * 3. For each configuration, determine if it's a template (name contains
     *    Liquid syntax) or a regular configuration.
     *
     * 4. For templates: Check `template.actions` for action definitions.
     *
     * 5. For regular configurations: Check `actions` directly.
     *
     * 6. Return true if any actions are found at any level.
     *
     * This comprehensive check is useful for determining whether xpm action
     * commands should be available or whether the package requires xpm for
     * build automation.
     *
     * @returns `true` if actions are defined directly or within build
     * configurations, `false` otherwise.
     *
     * @public
     */
    hasXpmActions() {
        const json = this.jsonPackage;
        if (!this.isXpmPackage()) {
            return false;
        }
        try {
            if (json?.xpack.actions !== undefined &&
                Object.keys(json.xpack.actions).length > 0) {
                return true;
            }
            if (json?.xpack.buildConfigurations !== undefined &&
                Object.keys(json.xpack.buildConfigurations).length > 0) {
                for (const buildConfigurationName of Object.keys(json.xpack.buildConfigurations)) {
                    const buildConfiguration = json.xpack.buildConfigurations[buildConfigurationName];
                    if (buildConfigurationName.includes('{{') ||
                        buildConfigurationName.includes('{%')) {
                        const buildConfigurationTemplate = buildConfiguration;
                        if (buildConfigurationTemplate.template.actions !== undefined &&
                            Object.keys(buildConfigurationTemplate.template.actions).length >
                                0) {
                            return true;
                        }
                    }
                    else {
                        const buildConfigurationContent = buildConfiguration;
                        if (buildConfigurationContent.actions !== undefined &&
                            Object.keys(buildConfigurationContent.actions).length > 0) {
                            return true;
                        }
                    }
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }
        catch (err) {
            // In case xpack is not an option to get its properties.
        }
        return false;
    }
    /**
     * Retrieves the minimum required xpm version specified by the package.
     *
     * @returns The minimum required xpm version without pre-release suffixes, or
     * undefined if not specified.
     *
     * @public
     */
    getMinimumXpmRequired() {
        const log = this._log;
        const jsonPackage = this.jsonPackage;
        log.trace(`${XpmPackage.name}.getMinimumXpmRequired()`);
        const version = jsonPackage?.xpack.minimumXpmRequired;
        if (version === undefined) {
            return undefined;
        }
        // Remove the pre-release part.
        return version.replace(/-.*$/, '');
    }
    /**
     * Validates the minimum required xpm version against the installed CLI.
     *
     * @remarks
     * This method ensures that packages requiring specific xpm features or bug
     * fixes can enforce a minimum version requirement, preventing runtime
     * errors or unexpected behavior with older xpm versions.
     *
     * Validation workflow:
     *
     * 1. Check if package is an xpm package with `minimumXpmRequired` set.
     *
     * 2. Clean the required version by removing pre-release suffixes.
     *
     * 3. Load the xpm CLI's package.json from the provided root folder.
     *
     * 4. Extract and clean the installed xpm version.
     *
     * 5. Compare versions using semver to determine if upgrade is needed.
     *
     * 6. Throw {@link XpmPrerequisitesError} if installed version is too old.
     *
     * Pre-release suffixes are stripped from both versions to ensure that
     * pre-release builds satisfy version requirements (e.g., 1.0.0-beta
     * satisfies minimumXpmRequired: 1.0.0).
     *
     * @param xpmRootFolderPath - The folder path to the xpm CLI package.
     * @returns The cleaned minimum required version, or undefined if no check is
     * required.
     *
     * @throws {@link XpmPrerequisitesError}
     * If the installed xpm version is lower than the required minimum.
     *
     * @public
     */
    async checkMinimumXpmRequired({ xpmRootFolderPath, }) {
        const log = this._log;
        const jsonPackage = this.jsonPackage;
        log.trace(`${XpmPackage.name}.checkMinimumXpmRequired()`);
        if (!jsonPackage) {
            // Not in a package.
            return undefined;
        }
        if (!this.isXpmPackage() || !jsonPackage.xpack.minimumXpmRequired) {
            log.trace('minimumXpmRequired not used, no checks');
            return undefined;
        }
        // Remove the pre-release part.
        const cleanedVersion = semver.clean(jsonPackage.xpack.minimumXpmRequired.replace(/-.*$/, ''));
        if (!cleanedVersion) {
            return undefined;
        }
        const minimumXpmRequired = cleanedVersion;
        log.trace(`minimumXpmRequired: ${minimumXpmRequired}`);
        let jsonXpmCliPackage;
        try {
            const cliXpmPackage = new XpmPackage({
                log,
                packageFolderPath: xpmRootFolderPath,
            });
            jsonXpmCliPackage = await cliXpmPackage.readPackageDotJson({
                withThrow: true,
            });
        }
        catch (err) {
            if (err instanceof Error) {
                log.trace(err.message);
            }
            else {
                log.trace(err);
            }
            return undefined;
        }
        assert(jsonXpmCliPackage);
        log.trace(jsonXpmCliPackage.version);
        if (!jsonXpmCliPackage.version) {
            return undefined;
        }
        // Remove the pre-release part.
        const xpmVersion = semver.clean(jsonXpmCliPackage.version.replace(/-.*$/, ''));
        if (!xpmVersion) {
            return undefined;
        }
        if (semver.lt(xpmVersion, minimumXpmRequired)) {
            throw new XpmPrerequisitesError('package ' +
                (jsonPackage.name ? `'${jsonPackage.name}' ` : '') +
                `requires xpm v${minimumXpmRequired} or later, please upgrade`);
        }
        // Check passed.
        return minimumXpmRequired;
    }
    /**
     * Parses an npm package specifier into its components.
     *
     * @remarks
     * npm package specifiers can take several forms:
     *
     * - Unscoped without version: `package-name`
     *
     * - Unscoped with version: `package-name@1.2.3`
     *
     * - Scoped without version: `@scope/package-name`
     *
     * - Scoped with version: `@scope/package-name@1.2.3`
     *
     * Parsing strategy:
     *
     * 1. If specifier starts with `@`, extract scope and handle scoped format.
     *
     * 2. Split on `/` to separate scope from name\@version.
     *
     * 3. Split the second part on `@` to separate name from version.
     *
     * 4. For unscoped packages, split directly on `@` to separate name from
     *    version.
     *
     * The parser handles all valid npm package specifier formats and returns
     * structured components for downstream processing. Invalid formats with
     * multiple slashes are rejected.
     *
     * @param npmPackageSpecifier - The npm package specifier to parse.
     * @returns The parsed package specifier components.
     *
     * @throws {@link XpmInputError}
     * If the specifier is not a valid package name format.
     *
     * @public
     */
    parsePackageSpecifier({ npmPackageSpecifier, }) {
        assert(npmPackageSpecifier);
        const log = this._log;
        let scope;
        let name;
        let version;
        if (npmPackageSpecifier.startsWith('@')) {
            const arr = npmPackageSpecifier.split('/');
            if (arr.length > 2) {
                throw new XpmInputError(`'${npmPackageSpecifier}' not a package name`);
            }
            scope = arr[0];
            if (arr.length > 1) {
                const arr2 = arr[1].split('@');
                name = arr2[0];
                if (arr2.length > 1) {
                    version = arr2[1];
                }
            }
        }
        else {
            const arr2 = npmPackageSpecifier.split('@');
            name = arr2[0];
            if (arr2.length > 1) {
                version = arr2[1];
            }
        }
        log.trace(`${npmPackageSpecifier} => ` +
            `${scope ?? '?'} ${name ?? '?'} ${version ?? '?'}`);
        return { scope, name, version };
    }
}
// ----------------------------------------------------------------------------
