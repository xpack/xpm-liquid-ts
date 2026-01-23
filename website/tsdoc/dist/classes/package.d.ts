import { Logger } from '@xpack/logger';
import { JsonXpmPackage } from '../types/json.js';
import { JsonPackageSpecifier } from '../types/json.js';
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
export declare class XpmPackage {
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
    packageFolderPath: string;
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
    jsonPackage?: JsonXpmPackage;
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
    protected _log: Logger;
    /**
     * Constructs a package helper bound to a specific folder.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param packageFolderPath - The absolute path to the package folder.
     *
     * @public
     */
    constructor({ log, packageFolderPath, }: {
        log: Logger;
        packageFolderPath: string;
    });
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
    readPackageDotJson({ withThrow, }?: {
        withThrow?: boolean;
    }): Promise<JsonXpmPackage | undefined>;
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
    rewritePackageDotJson(jsonPackage: JsonXpmPackage): Promise<void>;
    /**
     * Determines whether the package.json content represents a valid npm package.
     *
     * @returns `true` if the package has a valid name and version, `false`
     * otherwise.
     *
     * @public
     */
    isNpmPackage(): boolean;
    /**
     * Determines whether the package is an xpm package.
     *
     * @returns `true` if the package is a valid npm package with an xpack
     * section, `false` otherwise.
     *
     * @public
     */
    isXpmPackage(): boolean;
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
    isBinaryXpmPackage(): boolean;
    /**
     * Determines whether the package is a Node module without xpm metadata.
     *
     * @returns `true` if the package is a Node module without xpm metadata,
     * `false` otherwise.
     *
     * @public
     */
    isNodeModule(): false;
    /**
     * Determines whether the package is a Node module with a binary entry.
     *
     * @returns `true` if the package is a Node module with a bin entry,
     * `false` otherwise.
     *
     * @public
     */
    isBinaryNodeModule(): false;
    /**
     * Determines whether the package defines any npm scripts.
     *
     * @returns `true` if at least one script is defined, `false` otherwise.
     *
     * @public
     */
    hasNpmScripts(): boolean;
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
    hasXpmActions(): boolean;
    /**
     * Retrieves the minimum required xpm version specified by the package.
     *
     * @returns The minimum required xpm version without pre-release suffixes, or
     * undefined if not specified.
     *
     * @public
     */
    getMinimumXpmRequired(): string | undefined;
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
    checkMinimumXpmRequired({ xpmRootFolderPath, }: {
        xpmRootFolderPath: string;
    }): Promise<string | undefined>;
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
    parsePackageSpecifier({ npmPackageSpecifier, }: {
        npmPackageSpecifier: string;
    }): JsonPackageSpecifier;
}
//# sourceMappingURL=package.d.ts.map