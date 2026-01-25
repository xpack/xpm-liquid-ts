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
 * <ol>
 * <li>Basic file I/O: Read and write package.json with error handling.</li>
 * <li>npm validation: Check for valid npm package structure (name,
 * version).</li>
 * <li>xpm validation: Verify xpack section presence and structure.</li>
 * <li>Binary package validation: Validate binary-specific metadata
 *    (executables, binaries, platforms).</li>
 * <li>Capability detection: Determine package features (scripts, actions,
 *    build configurations).</li>
 * <li>Version checking: Validate minimum xpm version requirements.</li>
 * <li>Specifier parsing: Extract scope, name, and version from package
 *    identifiers.</li>
 * </ol>
 *
 * This hierarchy allows validation to be performed incrementally as needed,
 * avoiding unnecessary checks for packages that don't meet earlier criteria.
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
     * <ol>
     * <li>Must be an absolute path to a directory.</li>
     * <li>Directory should contain (or will contain) a package.json file.</li>
     * <li>Used to construct the path to package.json as
     *    <code>\{packageFolderPath\}/package.json</code>.</li>
     * <li>Remains constant throughout the lifecycle of the XpmPackage
     *    instance.</li>
     * </ol>
     *
     * The path is set during construction and used by all methods that access
     * or modify package.json.
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
     * <ol>
     * <li>Initially undefined when the XpmPackage instance is created.</li>
     * <li>Populated by <code>XpmPackage.readPackageDotJson</code> upon successful
     *    read andparse.</li>
     * <li>Cleared to undefined if parsing fails with
     *    <code>withThrow</code> enabled.</li>
     * <li>Used by validation methods (isNpmPackage, isXpmPackage,
     *    isBinaryXpmPackage) to check package capabilities.</li>
     * <li>Not automatically updated when package.json is modified externally;
     *    call <code>XpmPackage.readPackageDotJson</code> again to refresh.</li>
     * </ol>
     *
     * The cached content improves performance for packages that perform
     * multiple validation checks without file system access overhead.
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
     * <ol>
     * <li>Trace package folder path during construction.</li>
     * <li>Log file read errors when investigating missing package.json.</li>
     * <li>Trace JSON parsing errors for debugging invalid package.json.</li>
     * <li>Log version validation details during minimumXpmRequired checks.</li>
     * <li>Trace package specifier parsing for debugging dependency
     *    resolution.</li>
     * </ol>
     *
     * The logger enables detailed diagnostics without affecting normal
     * operation, as trace-level output is typically disabled in production.
     */
    protected _log: Logger;
    /**
     * Constructs a package helper bound to a specific folder.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param packageFolderPath - The absolute path to the package folder.
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
     */
    rewritePackageDotJson(jsonPackage: JsonXpmPackage): Promise<void>;
    /**
     * Determines whether the package.json content represents a valid npm package.
     *
     * @returns `true` if the package has a valid name and version, `false`
     * otherwise.
     */
    isNpmPackage(): boolean;
    /**
     * Determines whether the package is an xpm package.
     *
     * @returns `true` if the package is a valid npm package with an xpack
     * section, `false` otherwise.
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
     * <ol>
     * <li>If <code>xpack.executables</code> (or deprecated
     *    <code>xpack.bin</code>) exists, then
     *    <code>xpack.binaries</code> and <code>xpack.binaries.platforms</code>
     *    must also exist.</li>
     * <li>If <code>xpack.binaries</code> exists, then
     *    <code>xpack.binaries.platforms</code> and
     *    <code>xpack.executables</code> (or deprecated
     *    <code>xpack.bin</code>) must also exist.</li>
     * </ol>
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
     */
    isBinaryXpmPackage(): boolean;
    /**
     * Determines whether the package is a Node module without xpm metadata.
     *
     * @returns `true` if the package is a Node module without xpm metadata,
     * `false` otherwise.
     */
    isNodeModule(): false;
    /**
     * Determines whether the package is a Node module with a binary entry.
     *
     * @returns `true` if the package is a Node module with a bin entry,
     * `false` otherwise.
     */
    isBinaryNodeModule(): false;
    /**
     * Determines whether the package defines any npm scripts.
     *
     * @returns `true` if at least one script is defined, `false` otherwise.
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
     * <ol>
     * <li>Check for package-level actions in <code>xpack.actions</code>.</li>
     * <li>If no package-level actions, iterate through all build
     *    configurations.</li>
     * <li>For each configuration, determine if it's a template (name contains
     *    Liquid syntax) or a regular configuration.</li>
     * <li>For templates: Check <code>template.actions</code> for action
     *    definitions.</li>
     * <li>For regular configurations: Check <code>actions</code> directly.</li>
     * <li>Return true if any actions are found at any level.</li>
     * </ol>
     *
     * This comprehensive check is useful for determining whether xpm action
     * commands should be available or whether the package requires xpm for
     * build automation.
     *
     * @returns `true` if actions are defined directly or within build
     * configurations, `false` otherwise.
     */
    hasXpmActions(): boolean;
    /**
     * Retrieves the minimum required xpm version specified by the package.
     *
     * @returns The minimum required xpm version without pre-release suffixes, or
     * undefined if not specified.
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
     * <ol>
     * <li>Check if package is an xpm package with
     *   <code>minimumXpmRequired</code> set.</li>
     * <li>Clean the required version by removing pre-release suffixes.</li>
     * <li>Load the xpm CLI's package.json from the provided root folder.</li>
     * <li>Extract and clean the installed xpm version.</li>
     * <li>Compare versions using semver to determine if upgrade is needed.</li>
     * <li>Throw <code>XpmPrerequisitesError</code> if installed version is
     * too old.</li>
     * </ol>
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
     * <ul>
     * <li>Unscoped without version: <code>package-name</code></li>
     * <li>Unscoped with version: <code>package-name\@1.2.3</code></li>
     * <li>Scoped without version: <code>\@scope/package-name</code></li>
     * <li>Scoped with version: <code>\@scope/package-name\@1.2.3</code></li>
     * </ul>
     *
     * Parsing strategy:
     *
     * <ol>
     * <li>If specifier starts with <code>\@</code>, extract scope and handle
     *   scoped format.</li>
     * <li>Split on <code>/</code> to separate scope from name\@version.</li>
     * <li>Split the second part on <code>\@</code> to separate name from
     *   version.</li>
     * <li>For unscoped packages, split directly on <code>\@</code> to separate
     *    name from version.</li>
     * </ol>
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
     */
    parsePackageSpecifier({ npmPackageSpecifier, }: {
        npmPackageSpecifier: string;
    }): JsonPackageSpecifier;
}
//# sourceMappingURL=package.d.ts.map