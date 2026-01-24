import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { XpmLiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
import { XpmLiquidActions } from './liquid-actions.js';
import { XpmLiquidBuildConfigurations } from './liquid-build-configurations.js';
import { JsonXpmPackage } from '../types/json.js';
/**
 * The property name used for the build folder relative path.
 */
export declare const buildFolderRelativePathPropertyName = "buildFolderRelativePath";
/**
 * Provides Liquid-based processing for an xpm package.
 *
 * @remarks
 * This class prepares substitution variables, creates the Liquid
 * engine, and exposes actions and build configurations defined in the package.
 *
 * The package processor serves as the top-level coordinator for all
 * Liquid-based template processing in an xpm package. It establishes the
 * foundation for variable substitution throughout the package hierarchy:
 *
 * 1. Initializes base substitution variables (platform detection, system
 *    information, etc.).
 *
 * 2. Adds package-specific variables from package.json metadata.
 *
 * 3. Merges user-defined properties from xpack.properties.
 *
 * 4. Creates package-level actions accessible across all contexts.
 *
 * 5. Creates build configurations, each inheriting the base substitution
 *    context and adding configuration-specific variables.
 *
 * This hierarchical structure ensures that templates at any level have
 * access to appropriate variables while maintaining clear scoping rules.
 * Package-level actions are available globally, while configuration-level
 * actions are scoped to their respective configurations.
 */
export declare class XpmLiquidPackage {
    /**
     * The logger instance for output and diagnostics.
     *
     * @remarks
     * This logger provides trace-level diagnostics for the entire package
     * processing hierarchy, including Liquid engine creation, variable
     * initialization, action collection setup, and build configuration
     * preparation. It's passed down to child components (actions and build
     * configurations) to maintain consistent logging throughout the package
     * lifecycle.
     */
    protected _log: Logger;
    /**
     * The Liquid engine used for substitutions.
     *
     * @remarks
     * This XpmLiquidEngine instance is configured with strict mode and custom
     * filters for xpm-specific operations. It's shared across all actions and
     * build configurations within the package, ensuring consistent template
     * processing behavior.
     *
     * Engine characteristics:
     *
     * 1. Strict mode enabled to catch undefined variable references.
     *
     * 2. Custom filters for platform detection (isPlatform, isArch).
     *
     * 3. Custom filters for path sanitization (filterPath, filterPosixPath,
     *    filterWin32Path).
     *
     * 4. Shared instance reduces memory overhead and ensures consistent
     *    template evaluation across all package components.
     */
    protected _engine: Liquid;
    /**
     * The JSON package definition.
     *
     * @remarks
     * This object contains the complete package.json content, including both
     * standard npm fields and xpm-specific extensions in the `xpack` section.
     *
     * Required structure:
     *
     * 1. Standard npm fields: name, version, dependencies, devDependencies.
     *
     * 2. Required `xpack` section containing xpm-specific configuration.
     *
     * 3. Optional xpack.properties for user-defined substitution variables.
     *
     * 4. Optional xpack.actions for package-level executable actions.
     *
     * 5. Optional xpack.buildConfigurations for build configuration
     *    definitions.
     *
     * The package definition is validated during construction, requiring the
     * xpack section to be present and be a valid JSON object.
     */
    protected _jsonPackage: JsonXpmPackage;
    /**
     * The variables available for Liquid substitutions.
     *
     * @remarks
     * This sealed object provides the base substitution context inherited by
     * all actions and build configurations within the package.
     *
     * Variable hierarchy:
     *
     * 1. Base variables (xpmLiquidSubstitutionsVariablesBase):
     *    - `env`: Environment variables from process.env
     *    - `os`: Platform detection (platform, arch, endianness, version)
     *    - `path`: Path utilities (sep, delimiter, cwd)
     *
     * 2. Package metadata:
     *    - `package`: Complete package.json content (name, version,
     *      dependencies, etc.)
     *
     * 3. User-defined properties:
     *    - `properties`: Merged from xpack.properties if present
     *
     * The object is sealed after initialization to prevent accidental
     * modification. Child components (actions and configurations) extend this
     * context with their own scoped variables (configuration, matrix) without
     * modifying the original sealed object.
     */
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    /**
     * The actions collection for this package.
     *
     * @remarks
     * This collection manages package-level actions defined in
     * xpack.actions, which are globally accessible and not tied to specific
     * build configurations.
     *
     * Package-level actions characteristics:
     *
     * 1. Created during construction but initially unpopulated.
     *
     * 2. Populated during the collection's own initialisation when
     *    {@link XpmLiquidActions.initialise} is called.
     *
     * 3. Have access to package-level substitution variables but not
     *    configuration-specific variables.
     *
     * 4. Suitable for package-wide tasks like testing, documentation
     *    generation, or global cleanup.
     *
     * 5. Can be used alongside configuration-specific actions, which inherit
     *    from package-level actions.
     */
    readonly actions: XpmLiquidActions;
    /**
     * The build configurations collection for this package.
     *
     * @remarks
     * This collection manages all build configurations defined in
     * xpack.buildConfigurations, supporting inheritance, template expansion,
     * and configuration-specific properties and dependencies.
     *
     * Build configurations characteristics:
     *
     * 1. Created during construction but initially unpopulated.
     *
     * 2. Populated during the collection's own initialisation when
     *    {@link XpmLiquidBuildConfigurations.initialise} is called.
     *
     * 3. Each configuration inherits the package-level substitution variables
     *    and extends them with configuration-specific context.
     *
     * 4. Support complex inheritance chains where configurations can inherit
     *    properties, dependencies, and actions from other configurations.
     *
     * 5. Can be generated from templates with matrix expansion for
     *    multi-platform or multi-variant builds.
     *
     * 6. Each configuration maintains its own actions collection, inheriting
     *    package-level actions and adding configuration-specific ones.
     */
    readonly buildConfigurations: XpmLiquidBuildConfigurations;
    /**
     * Constructs a Liquid package processor.
     *
     * @remarks
     * The constructor initializes the Liquid engine and prepares the
     * substitution variables context that will be inherited by all actions
     * and build configurations.
     *
     * Initialization sequence:
     *
     * 1. Create XpmLiquidEngine with custom filters and strict configuration.
     *
     * 2. Validate xpack section exists in package.json.
     *
     * 3. Initialize base substitution variables (os, platform, arch, etc.).
     *
     * 4. Add package metadata to substitution context.
     *
     * 5. Merge xpack.properties if defined, allowing user-defined variables.
     *
     * 6. Seal substitution variables to prevent accidental modification.
     *
     * 7. Create package-level actions collection (initially empty, populated
     *    during initialisation).
     *
     * 8. Create build configurations collection (initially empty, populated
     *    during initialisation).
     *
     * The substitution variables object is sealed to ensure immutability of
     * the base context. Individual actions and configurations will extend this
     * context with their own scoped variables without modifying the original.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param jsonPackage - The JSON package definition.
     */
    constructor({ log, jsonPackage, }: {
        log: Logger;
        jsonPackage: JsonXpmPackage;
    });
}
//# sourceMappingURL=liquid-package.d.ts.map