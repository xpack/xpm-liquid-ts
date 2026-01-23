import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from './liquid-engine.js';
import { XpmLiquidSubstitutionsVariables, XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonBuildConfiguration, JsonBuildConfigurationContent, JsonBuildConfigurations, JsonBuildConfigurationTemplate, JsonDependencies } from '../types/json.js';
import { XpmLiquidActions } from './liquid-actions.js';
/**
 * A collection of xpm build configurations.
 *
 * @remarks
 * This class manages build configurations defined in package metadata,
 * including template expansion with matrix parameters and initialisation of
 * derived configuration instances.
 *
 * Configuration lifecycle phases:
 *
 * 1. Construction: Basic setup without processing configurations.
 *
 * 2. Initialisation: Template name expansion without content evaluation.
 *
 * 3. Retrieval: On-demand instantiation when accessed via get().
 *
 * 4. Configuration Initialisation: Full processing including inheritance,
 *    property resolution, dependency substitution, and action preparation.
 *
 * This lazy evaluation strategy ensures that only configurations actually
 * used incur the cost of template evaluation, inheritance resolution, and
 * variable substitution.
 *
 * @public
 */
export declare class XpmLiquidBuildConfigurations {
    /**
     * The logger instance for output and diagnostics.
     *
     * @remarks
     * This logger provides trace-level diagnostics throughout the build
     * configuration lifecycle, including template expansion, inheritance
     * resolution, property merging, and dependency substitution. It enables
     * detailed debugging of complex build configuration hierarchies without
     * impacting runtime performance when tracing is disabled.
     *
     * @public
     */
    readonly log: Logger;
    /**
     * The Liquid templating engine for variable substitution.
     *
     * @remarks
     * This engine instance is shared across all build configurations and
     * configured with custom filters for platform detection, path
     * manipulation, and xpm-specific operations. It processes templates in
     * configuration names, matrix parameters, properties, dependencies, and
     * actions, ensuring consistent template evaluation throughout the
     * configuration lifecycle.
     *
     * @public
     */
    readonly engine: XpmLiquidEngine;
    /**
     * The variables available for substitution in configuration definitions.
     *
     * @remarks
     * This comprehensive variable hierarchy provides the base context for all
     * build configuration template evaluation, extended per-configuration with
     * specific properties, dependencies, and matrix parameters.
     *
     * Base hierarchy includes:
     *
     * 1. Environment variables: `env` namespace with system environment.
     *
     * 2. Platform detection: `os` namespace with platform-specific values.
     *
     * 3. Path utilities: `path` namespace with path manipulation functions.
     *
     * 4. Package metadata: `package` namespace with name, version,
     *    dependencies.
     *
     * Individual configurations extend this with their own `properties`,
     * `configuration`, and `matrix` namespaces during initialisation.
     *
     * @public
     */
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    /**
     * The JSON object containing build configuration definitions.
     *
     * @remarks
     * This object holds raw build configuration definitions from the
     * package.json `xpack.buildConfigurations` section. Configurations can be:
     *
     * 1. Regular configurations: Direct objects with properties, dependencies,
     *    actions, and inheritance.
     *
     * 2. Template configurations: Objects with `matrix` and `template`
     *    properties for generating multiple configurations from a single
     *    definition.
     *
     * Template configuration names (containing `{{` markers) trigger matrix
     * expansion during initialisation, creating concrete configurations from
     * the Cartesian product of matrix parameter values. Each configuration
     * can inherit from others, creating complex dependency hierarchies.
     *
     * @public
     */
    readonly jsonBuildConfigurations: JsonBuildConfigurations;
    /**
     * Map of build configuration names to their corresponding instances.
     *
     * @remarks
     * This map serves as the primary configuration registry, populated during
     * collection initialisation with entries for all discovered configurations.
     *
     * Key characteristics:
     *
     * 1. Known only after {@link XpmLiquidBuildConfigurations.initialise}
     *    completes.
     *
     * 2. Possibly empty if there are no build configurations defined.
     *
     * 3. Values can be `undefined` to indicate a configuration exists but
     *    hasn't been instantiated yet (lazy loading).
     *
     * 4. For template configurations, contains one entry per expanded
     *    combination, not the original template definition.
     *
     * Configurations transition from `undefined` to instantiated when first
     * accessed via {@link XpmLiquidBuildConfigurations.get}, implementing the
     * lazy evaluation pattern to avoid unnecessary processing.
     *
     * @public
     */
    protected readonly _buildConfigurationsMap: Map<string, XpmLiquidBuildConfiguration | undefined>;
    /**
     * Map of expanded build configuration names to their JSON source names.
     *
     * @remarks
     * This reverse mapping enables retrieving the original configuration
     * definition from `jsonBuildConfigurations` when lazy-loading
     * configuration instances.
     *
     * Mapping behavior:
     *
     * 1. For regular configurations: Maps configuration name to itself
     *    (identity mapping).
     *
     * 2. For template configurations: Maps each generated configuration name
     *    back to the original template name (e.g., `release-x64` →
     *    `release-{{ matrix.arch }}`).
     *
     * 3. Known only after {@link XpmLiquidBuildConfigurations.initialise}
     *    completes.
     *
     * 4. Enables {@link XpmLiquidBuildConfigurations.get} to locate the
     *    correct JSON definition when instantiating a configuration on demand.
     *
     * This indirection is essential for lazy evaluation, allowing deferred
     * instantiation while maintaining the connection to original definitions.
     *
     * @public
     */
    protected readonly _jsonBuildConfigurationsNamesMap: Map<string, string>;
    /**
     * Set of all build configuration names for duplicate detection.
     *
     * @remarks
     * This set provides O(1) existence checks for configuration names,
     * enabling efficient validation during template expansion to prevent
     * duplicate configurations.
     *
     * Duplicate scenarios detected:
     *
     * 1. Explicit duplicates in package.json with identical names.
     *
     * 2. Template expansion conflicts where different templates generate the
     *    same concrete configuration name.
     *
     * 3. Conflicts between template-generated names and explicitly defined
     *    configuration names.
     *
     * Detection occurs during {@link XpmLiquidBuildConfigurations.initialise},
     * throwing {@link XpmError} when duplicates are found to ensure
     * configuration name uniqueness.
     *
     * @public
     */
    protected readonly _buildComfigurationsNamesSet: Set<string>;
    /**
     * Flag indicating whether the collection has been initialised.
     *
     * @remarks
     * This flag prevents redundant initialisation and ensures idempotent
     * behavior when {@link XpmLiquidBuildConfigurations.initialise} is called
     * multiple times.
     *
     * State transitions:
     *
     * 1. Initially `false` after construction.
     *
     * 2. Set to `true` after successful template expansion and configuration
     *    name registration.
     *
     * 3. Checked at the beginning of
     *    {@link XpmLiquidBuildConfigurations.initialise} to return early if
     *    already initialised.
     *
     * This pattern supports safe repeated calls during complex initialisation
     * sequences without duplicating work or corrupting internal state.
     *
     * @public
     */
    protected _isInitialised: boolean;
    /**
     * Constructs a build configurations collection.
     *
     * @remarks
     * The constructor performs partial initialisation. Complete
     * initialisation requires calling
     * {@link XpmLiquidBuildConfigurations.initialise}.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param engine - The Liquid templating engine for variable substitution.
     * @param substitutionsVariables - The variables available for substitution.
     * @param jsonBuildConfigurations - The JSON build configurations definitions,
     * or undefined if no build configurations are defined.
     *
     * @public
     */
    constructor({ log, engine, substitutionsVariables, jsonBuildConfigurations, }: {
        log: Logger;
        engine: XpmLiquidEngine;
        substitutionsVariables: XpmLiquidSubstitutionsVariables;
        jsonBuildConfigurations: JsonBuildConfigurations | undefined;
    });
    /**
     * Completes the async initialisation of the build configurations collection.
     *
     * @remarks
     * This method implements the first step of lazy evaluation. It processes
     * all build configuration definitions by expanding template configuration
     * names based on matrix parameters, but does not evaluate the configuration
     * content or perform Liquid substitutions. The actual template evaluation
     * and variable substitution occur later when individual configurations are
     * initialised via {@link XpmLiquidBuildConfiguration.initialise}, and only
     * for configurations that are actually used. This approach avoids unnecessary
     * operations on unused configurations. The method also validates that all
     * expanded configuration names are unique and prepares the internal lookup
     * maps.
     *
     * @returns A promise that resolves to `true` if initialisation was performed,
     * or `false` if already initialised.
     *
     * @throws {@link XpmError}
     * If duplicate names are detected or template expansion fails.
     *
     * @public
     */
    initialise(): Promise<boolean>;
    /**
     * Determines whether the collection is empty.
     *
     * @returns `true` if there are no build configurations, `false` otherwise.
     *
     * @public
     */
    empty(): boolean;
    /**
     * Retrieves the names of all build configurations.
     *
     * @returns An array of build configuration names.
     *
     * @public
     */
    names(): string[];
    /**
     * Retrieves the JSON configuration name for a build configuration.
     *
     * @param buildConfigurationName - The build configuration name to resolve.
     * @returns The JSON configuration name associated with the given build
     * configuration name.
     *
     * @remarks
     * For template-generated configurations, this returns the template
     * name.
     *
     * @public
     */
    getJsonName(buildConfigurationName: string): string;
    /**
     * Determines whether a JSON definition exists for a build configuration.
     *
     * @param buildConfigurationName - The build configuration name to check.
     * @returns `true` if a JSON definition exists, `false` otherwise.
     *
     * @public
     */
    hasJson(buildConfigurationName: string): boolean;
    /**
     * Retrieves the JSON build configuration definition.
     *
     * @param buildConfigurationName - The build configuration name to resolve.
     * @returns The JSON build configuration definition.
     *
     * @public
     */
    getJson(buildConfigurationName: string): JsonBuildConfiguration;
    /**
     * Determines whether a build configuration is hidden.
     *
     * @param buildConfigurationName - The build configuration name to check.
     * @returns `true` if the configuration is hidden, `false` otherwise.
     *
     * @public
     */
    isHidden(buildConfigurationName: string): boolean;
    /**
     * Determines whether a build configuration exists in the collection.
     *
     * @param buildConfigurationName - The build configuration name to check.
     * @returns `true` if the configuration exists, `false` otherwise.
     *
     * @public
     */
    has(buildConfigurationName: string): boolean;
    /**
     * Retrieves a build configuration by name, creating it if required.
     *
     * @remarks
     * This method implements lazy evaluation to avoid unnecessary
     * operations. Build configurations are instantiated on demand but
     * remain uninitialised until actually used. The two-step process
     * works as follows:
     *
     * 1. During collection initialisation
     *    ({@link XpmLiquidBuildConfigurations.initialise}), only the
     *    matrix of options is evaluated for each template, expanding
     *    configuration names without processing their content.
     *
     * 2. Later, when a configuration is accessed via this method and
     *    subsequently initialised
     *    ({@link XpmLiquidBuildConfiguration.initialise}), the template
     *    is fully evaluated and Liquid substitutions are performed on
     *    all properties.
     *
     * This approach ensures that only build configurations that are
     * actually used incur the cost of template evaluation and variable
     * substitution.
     *
     * @param buildConfigurationName - The build configuration name to retrieve.
     * @returns The build configuration instance.
     *
     * @public
     */
    get(buildConfigurationName: string): XpmLiquidBuildConfiguration;
    /**
     * Expands a template build configuration into multiple configurations.
     *
     * @remarks
     * This method computes the Cartesian product of matrix parameter
     * values and creates a configuration for each combination, substituting
     * matrix values into both the configuration name and content.
     *
     * Processing steps:
     *
     * 1. Validates matrix structure (object with array values).
     *
     * 2. Validates template format (must be a JSON object).
     *
     * 3. Performs Liquid substitutions on matrix values if they contain
     *    template syntax.
     *
     * 4. Recursively generates all combinations using Cartesian product.
     *
     * 5. Creates a configuration instance for each combination with matrix
     *    parameters stored for later full evaluation.
     *
     * Matrix variables are scoped to individual configurations and accessible
     * via the `matrix` namespace during property, dependency, and action
     * evaluation.
     *
     * @param buildConfigurationName - The template configuration name containing
     * Liquid variables.
     * @param jsonBuildConfigurationTemplate - The template definition containing
     * matrix parameters and a configuration template.
     * @returns A promise that resolves to a map of expanded configuration names
     * to their corresponding instances.
     *
     * @throws {@link XpmError}
     * If the matrix structure is invalid or substitution fails.
     *
     * @public
     */
    protected _expandTemplateBuildConfigurations({ buildConfigurationName, jsonBuildConfigurationTemplate, }: {
        buildConfigurationName: string;
        jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate;
    }): Promise<Map<string, XpmLiquidBuildConfiguration>>;
}
/**
 * An individual xpm build configuration.
 *
 * @remarks
 * Build configurations are initialised lazily and may inherit
 * properties, dependencies, and actions from other configurations.
 *
 * A configuration can exist in three states:
 *
 * 1. Undefined: Name is known but instance not yet created.
 *
 * 2. Instantiated: Object exists but not yet fully processed.
 *
 * 3. Initialised: Inheritance resolved, properties evaluated, dependencies
 *    substituted, and actions prepared.
 *
 * Inheritance is processed recursively with circular reference detection.
 * Later inherited properties override earlier ones, and local properties
 * override all inherited ones. Dependencies and actions are merged from
 * all inherited configurations.
 *
 * @public
 */
export declare class XpmLiquidBuildConfiguration {
    /**
     * The build configuration name after substitution.
     *
     * @remarks
     * This is the final, expanded configuration name used for identification
     * and selection. For template-generated configurations, this is the
     * concrete name after matrix substitution (e.g., `release-x64` rather than
     * `release-{{ matrix.arch }}`).
     *
     * The name is used for:
     *
     * 1. User-facing identification when listing or selecting configurations.
     *
     * 2. Build folder path generation (default: `build/{name}`).
     *
     * 3. Logging and diagnostic output to track configuration lifecycle.
     *
     * 4. Inheritance references from other configurations.
     *
     * Names must be unique within the configurations collection, enforced
     * during {@link XpmLiquidBuildConfigurations.initialise}.
     *
     * @public
     */
    readonly buildConfigurationName: string;
    /**
     * The template build configuration name, if derived from a template.
     *
     * @remarks
     * For template-generated configurations, this preserves the original
     * template name containing Liquid variables (e.g.,
     * `release-{{ matrix.arch }}`), while `buildConfigurationName` holds the
     * expanded concrete name.
     *
     * Usage:
     *
     * 1. Undefined for regular (non-template) configurations.
     *
     * 2. Set to the template name for configurations generated from matrix
     *    expansion.
     *
     * 3. Used to determine whether full JSON substitution is needed during
     *    initialisation (templates require complete substitution, regular
     *    configurations only substitute specific fields).
     *
     * 4. Enables tracing and debugging of template expansion process.
     *
     * @public
     */
    readonly templateBuildConfigurationName?: string;
    /**
     * The parent build configurations collection.
     *
     * @remarks
     * This reference maintains the hierarchical relationship between
     * individual configurations and their containing collection, providing
     * essential context for configuration initialisation.
     *
     * The parent collection provides access to:
     *
     * 1. Liquid templating engine for variable substitution.
     *
     * 2. Base substitution variables hierarchy (package metadata,
     *    environment, platform detection).
     *
     * 3. Logger instance for diagnostic output.
     *
     * 4. JSON build configurations lookup for inheritance resolution.
     *
     * 5. Other configuration instances when processing inheritance chains.
     *
     * This design enables configurations to access shared resources without
     * duplicating them, while supporting complex inheritance relationships
     * where configurations reference and inherit from each other.
     *
     * @public
     */
    readonly parentBuildConfigurations: XpmLiquidBuildConfigurations;
    /**
     * The list of inherited configuration names.
     *
     * @remarks
     * This array specifies the inheritance chain for this configuration,
     * processed sequentially during initialisation with later entries
     * overriding earlier ones.
     *
     * Inheritance processing:
     *
     * 1. Populated from `inherits` or deprecated `inherit` field during
     *    initialisation.
     *
     * 2. Supports both string (single parent) and array (multiple parents)
     *    formats.
     *
     * 3. Each inherited configuration is initialised recursively before
     *    merging its properties, dependencies, and actions.
     *
     * 4. Circular references are detected and rejected with
     *    {@link XpmInputError}.
     *
     * 5. Later inherited configurations override properties from earlier
     *    ones, and local properties override all inherited ones.
     *
     * @public
     */
    inheritsNames: string[];
    /**
     * Indicates whether the configuration is hidden.
     *
     * @remarks
     * Hidden configurations are used for inheritance bases or intermediate
     * configurations that shouldn't be directly selected for building.
     *
     * Effects of hidden status:
     *
     * 1. Hidden configurations don't compute build folder relative paths
     *    during initialisation (optimization for inheritance-only configs).
     *
     * 2. May be excluded from user-facing configuration lists depending on
     *    application logic.
     *
     * 3. Still fully initialised and available for inheritance by other
     *    configurations.
     *
     * 4. Derived from `hidden` field in JSON configuration definition
     *    (defaults to `false`).
     *
     * Common use case: Base configurations that define common properties,
     * dependencies, or actions inherited by multiple concrete configurations.
     *
     * @public
     */
    readonly hidden: boolean;
    /**
     * The resolved properties for this configuration.
     *
     * @remarks
     * This object contains the final merged properties after inheritance
     * resolution and becomes available in the `properties` namespace for
     * Liquid template substitution.
     *
     * Property resolution order:
     *
     * 1. Start with empty object.
     *
     * 2. Merge properties from each inherited configuration in sequence
     *    (later overrides earlier).
     *
     * 3. Merge local properties from JSON definition (overrides all
     *    inherited).
     *
     * 4. Add computed `buildFolderRelativePath` property for non-hidden
     *    configurations.
     *
     * Properties are accessible in templates as `{{ properties.key }}` and
     * commonly used for compiler flags, toolchain paths, optimization
     * settings, and build-specific configuration values.
     *
     * @public
     */
    properties: XpmLiquidSubstitutionsStrings;
    /**
     * The resolved dependencies after substitutions.
     *
     * @remarks
     * This object contains the final merged dependencies after inheritance
     * resolution and Liquid template substitution.
     *
     * Dependency resolution workflow:
     *
     * 1. Start with empty object.
     *
     * 2. Merge dependencies from each inherited configuration in sequence
     *    (later overrides earlier).
     *
     * 3. Merge local dependencies from JSON definition.
     *
     * 4. Perform Liquid template substitution on the entire dependencies
     *    object with full configuration context (properties, matrix, etc.).
     *
     * This enables configuration-specific dependencies with dynamic version
     * ranges or package selection based on matrix parameters, platform
     * detection, or configuration properties.
     *
     * @public
     */
    dependencies: JsonDependencies;
    /**
     * The resolved development dependencies after substitutions.
     *
     * @remarks
     * This object contains the final merged development dependencies after
     * inheritance resolution and Liquid template substitution.
     *
     * Resolution workflow mirrors `dependencies`:
     *
     * 1. Start with empty object.
     *
     * 2. Merge devDependencies from each inherited configuration in sequence
     *    (later overrides earlier).
     *
     * 3. Merge local devDependencies from JSON definition.
     *
     * 4. Perform Liquid template substitution on the entire devDependencies
     *    object with full configuration context.
     *
     * Typical use: Test frameworks, build tools, or debugging utilities
     * specific to certain configurations (e.g., debug builds might include
     * additional analysis tools).
     *
     * @public
     */
    devDependencies: JsonDependencies;
    /**
     * The JSON build configuration content from package metadata.
     *
     * @remarks
     * This holds the raw configuration definition as it appears in
     * package.json, before inheritance resolution and variable substitution.
     *
     * The definition is preserved to:
     *
     * 1. Enable external modification (e.g., `xpm uninstall` updates this
     *    directly).
     *
     * 2. Support deferred template evaluation during
     *    {@link XpmLiquidBuildConfiguration.initialise}.
     *
     * 3. Provide the source for inheritance when other configurations
     *    reference this one.
     *
     * 4. Allow re-evaluation with different variable contexts if needed.
     *
     * This immutable storage ensures configurations can be safely referenced
     * during inheritance resolution without side effects.
     *
     * @public
     */
    jsonBuildConfiguration: JsonBuildConfigurationContent;
    /**
     * The variables used for substitution in this configuration.
     *
     * @remarks
     * This extended variable hierarchy combines the base collection variables
     * with configuration-specific context, enabling accurate template
     * evaluation.
     *
     * Extension hierarchy:
     *
     * 1. Starts with parent collection's base variables (env, os, path,
     *    package).
     *
     * 2. Extended with `properties`: Merged from inheritance chain and local
     *    properties.
     *
     * 3. Extended with `matrix`: Parameter values for template-generated
     *    configurations.
     *
     * 4. Extended with `configuration`: The configuration object itself
     *    (name, dependencies, properties) accessible for self-reference.
     *
     * This complete context is used for all substitutions within the
     * configuration: properties, dependencies, devDependencies, and actions.
     *
     * @public
     */
    protected substitutionsVariables: XpmLiquidSubstitutionsVariables;
    /**
     * The matrix parameter values for template-generated configurations.
     *
     * @remarks
     * For template-generated configurations, this object contains the specific
     * matrix parameter values that produced this configuration instance from
     * the template.
     *
     * Usage pattern:
     *
     * 1. Undefined for regular (non-template) configurations.
     *
     * 2. For template configurations, contains key-value pairs from the matrix
     *    combination (e.g., `{ arch: 'x64', optimize: 'speed' }`).
     *
     * 3. Merged into substitution variables during initialisation, making
     *    values accessible via the `matrix` namespace throughout the
     *    configuration.
     *
     * 4. Used in configuration name substitution, property values,
     *    dependencies, and action commands.
     *
     * Example: A template `release-{{ matrix.arch }}` with matrix parameters
     * `{ arch: 'x64' }` becomes the concrete configuration `release-x64`.
     *
     * @public
     */
    protected readonly matrixParameters?: XpmLiquidSubstitutionsStrings;
    /**
     * The actions associated with this build configuration.
     *
     * @remarks
     * This actions collection is created during configuration initialisation
     * and combines inherited actions with local action definitions.
     *
     * Action assembly workflow:
     *
     * 1. Undefined until {@link XpmLiquidBuildConfiguration.initialise} is
     *    called.
     *
     * 2. Collect actions from all inherited configurations in the inheritance
     *    chain.
     *
     * 3. Create new {@link XpmLiquidActions} collection with inherited
     *    actions map and local action definitions.
     *
     * 4. Actions inherit the configuration's substitution variables context,
     *    including properties and matrix parameters.
     *
     * Actions are accessible after configuration initialisation but remain
     * themselves uninitialised until retrieved and initialised individually,
     * maintaining the lazy evaluation pattern.
     *
     * @public
     */
    protected _actions: XpmLiquidActions | undefined;
    /**
     * The resolved build folder relative path.
     *
     * @remarks
     * This path specifies where build outputs for this configuration should be
     * placed, computed during initialisation and added back to properties for
     * use in subsequent substitutions.
     *
     * Computation workflow:
     *
     * 1. Undefined until {@link XpmLiquidBuildConfiguration.initialise} is
     *    called.
     *
     * 2. Not computed for hidden configurations (optimization).
     *
     * 3. If `buildFolderRelativePath` property exists, perform Liquid
     *    substitution with full configuration context.
     *
     * 4. Otherwise, generate default path: `build/{sanitized-config-name}`.
     *
     * 5. Added to `properties.buildFolderRelativePath` for use in action
     *    commands and dependency references.
     *
     * The path is relative to the package root and used by build tools to
     * organize outputs from different configurations.
     *
     * @public
     */
    protected _buildFolderRelativePath?: string;
    /**
     * Set of inherited configuration names for circular reference detection.
     *
     * @remarks
     * This set tracks the inheritance chain being processed to detect and
     * prevent circular inheritance references.
     *
     * Detection mechanism:
     *
     * 1. Initially empty when configuration initialisation begins.
     *
     * 2. Each inherited configuration name is added before processing that
     *    configuration's inheritance.
     *
     * 3. If a configuration attempts to inherit from a name already in the
     *    set, a circular reference exists.
     *
     * 4. Circular references trigger {@link XpmInputError} with details about
     *    the problematic inheritance chain.
     *
     * Example: If config A inherits from B, B from C, and C from A, the
     * circular dependency is detected when C attempts to inherit from A.
     *
     * @public
     */
    protected _inheritedNamesSet: Set<string>;
    /**
     * Flag indicating whether the configuration has been initialised.
     *
     * @remarks
     * This flag ensures idempotent initialization and prevents redundant
     * processing when {@link XpmLiquidBuildConfiguration.initialise} is called
     * multiple times.
     *
     * State transitions:
     *
     * 1. Initially `false` after construction.
     *
     * 2. Set to `true` after successful inheritance resolution, property
     *    merging, dependency substitution, and action preparation.
     *
     * 3. Checked at the start of
     *    {@link XpmLiquidBuildConfiguration.initialise} to return early if
     *    already initialised.
     *
     * This pattern is critical for inheritance processing, as configurations
     * may be initialised multiple times when referenced by multiple children,
     * but should only process their inheritance chain once.
     *
     * @public
     */
    protected _isInitialised: boolean;
    /**
     * Indicates whether this configuration originates from a template.
     *
     * @remarks
     * This flag determines the substitution strategy during configuration
     * initialisation, with template configurations requiring more extensive
     * processing.
     *
     * Template vs regular configuration processing:
     *
     * 1. Template configurations (`isTemplate === true`):
     *    - Entire JSON configuration is stringified and substituted.
     *    - Matrix parameters available throughout all fields.
     *    - More expensive but supports matrix references anywhere.
     *
     * 2. Regular configurations (`isTemplate === false`):
     *    - Only `inherits` field is substituted initially.
     *    - Other fields processed selectively during inheritance resolution.
     *    - More efficient for configurations without matrix parameters.
     *
     * Set to `true` when `templateBuildConfigurationName` is defined,
     * indicating the configuration was generated from a template expansion.
     *
     * @public
     */
    isTemplate: boolean;
    /**
     * Constructs a build configuration instance.
     *
     * @param buildConfigurationName - The configuration name after substitution.
     * @param templateBuildConfigurationName - The template configuration name, if
     * derived from a template.
     * @param jsonBuildConfiguration - The JSON configuration definition.
     * @param parentBuildConfigurations - The parent configurations collection.
     * @param matrixParameters - Optional matrix parameter values for
     * template-generated configurations.
     *
     * @remarks
     * The constructor performs partial initialisation. Full initialisation
     * requires calling {@link XpmLiquidBuildConfiguration.initialise}.
     *
     * @public
     */
    constructor({ buildConfigurationName, templateBuildConfigurationName, jsonBuildConfiguration, parentBuildConfigurations, matrixParameters, }: {
        buildConfigurationName: string;
        templateBuildConfigurationName?: string;
        jsonBuildConfiguration: JsonBuildConfigurationContent;
        parentBuildConfigurations: XpmLiquidBuildConfigurations;
        matrixParameters?: XpmLiquidSubstitutionsStrings;
    });
    /**
     * Completes the async initialisation of the build configuration.
     *
     * @remarks
     * This method resolves inheritance, applies variable substitutions,
     * computes dependencies, and prepares actions.
     *
     * Initialisation workflow:
     *
     * 1. For template configurations: Substitute matrix parameters throughout
     *    the entire JSON structure.
     *
     * 2. For non-template configurations: Substitute only the inherits field.
     *
     * 3. Process inheritance chain recursively with circular reference
     *    detection.
     *
     * 4. Merge properties, dependencies, and devDependencies from inherited
     *    configurations (later overrides earlier).
     *
     * 5. Apply local properties and update substitution variables context.
     *
     * 6. For visible configurations: Compute build folder relative path.
     *
     * 7. Substitute Liquid templates in dependencies and devDependencies.
     *
     * 8. Create actions collection with inherited actions and local actions.
     *
     * The substitution context includes package variables, configuration
     * properties, matrix parameters (for templates), and the configuration
     * object itself accessible via `configuration.name`, etc.
     *
     * @returns A promise that resolves to `true` if initialisation was performed,
     * or `false` if already initialised.
     *
     * @throws {@link XpmError}
     * If substitutions fail.
     *
     * @throws {@link XpmInputError}
     * If inheritance references are invalid or circular.
     *
     * @public
     */
    initialise(): Promise<boolean>;
    /**
     * Retrieves the actions collection for this build configuration.
     *
     * @returns The actions collection.
     *
     * @throws `AssertionError`
     * If the configuration has not been initialised.
     *
     * @public
     */
    get actions(): XpmLiquidActions;
    /**
     * Retrieves the build folder relative path for this configuration.
     *
     * @returns The build folder relative path.
     *
     * @throws `AssertionError`
     * If the configuration has not been initialised.
     *
     * @public
     */
    get buildFolderRelativePath(): string;
    /**
     * Computes the build folder relative path for this configuration.
     *
     * @remarks
     * This method resolves the build folder relative path property when
     * provided and uses a default value based on the configuration name
     * otherwise.
     *
     * Resolution strategy:
     *
     * 1. Check if buildFolderRelativePath property exists in configuration
     *    properties.
     *
     * 2. If present and non-empty, perform Liquid substitutions with the
     *    full configuration context.
     *
     * 3. If substitution fails or property is empty/missing, generate a
     *    default path: `build/{filtered-configuration-name}` where the
     *    configuration name is sanitized for filesystem compatibility.
     *
     * The computed path is added back to the properties as
     * `buildFolderRelativePath` for use in subsequent substitutions.
     *
     * @returns A promise that resolves to the build folder relative path.
     *
     * @public
     */
    protected _getBuildFolderRelativePath(): Promise<string>;
}
//# sourceMappingURL=liquid-build-configurations.d.ts.map