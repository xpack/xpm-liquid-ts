import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from './liquid-engine.js';
import { XpmLiquidSubstitutionsVariables, XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonBuildConfiguration, JsonBuildConfigurationContent, JsonBuildConfigurations, JsonBuildConfigurationTemplate, JsonDependencies } from '../types/json.js';
import { XpmActions } from './actions.js';
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
 * <ol>
 * <li>Construction: Basic setup without processing configurations.</li>
 * <li>Initialisation: Template name expansion without content evaluation.</li>
 * <li>Retrieval: On-demand instantiation when accessed via get().</li>
 * <li>Configuration Initialisation: Full processing including inheritance,
 *    property resolution, dependency substitution, and action preparation.</li>
 * </ol>
 *
 * This lazy evaluation strategy ensures that only configurations actually
 * used incur the cost of template evaluation, inheritance resolution, and
 * variable substitution.
 */
export declare class XpmBuildConfigurations {
    /**
     * The logger instance for output and diagnostics.
     *
     * @remarks
     * This logger provides trace-level diagnostics throughout the build
     * configuration lifecycle, including template expansion, inheritance
     * resolution, property merging, and dependency substitution. It enables
     * detailed debugging of complex build configuration hierarchies without
     * impacting runtime performance when tracing is disabled.
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
     * <ol>
     * <li>Environment variables: <code>env</code> namespace with system
     *   environment.</li>
     * <li>Platform detection: <code>os</code> namespace with platform-specific
     *   values.</li>
     * <li>Path utilities: <code>path</code> namespace with path manipulation
     *   functions.</li>
     * <li>Package metadata: <code>package</code> namespace with name, version,
     *    dependencies.</li>
     * </ol>
     *
     * Individual configurations extend this with their own `properties`,
     * `configuration`, and `matrix` namespaces during initialisation.
     */
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    /**
     * The JSON object containing build configuration definitions.
     *
     * @remarks
     * This object holds raw build configuration definitions from the
     * package.json `xpack.buildConfigurations` section. Configurations can be:
     *
     * <ol>
     * <li>Regular configurations: Direct objects with properties, dependencies,
     *    actions, and inheritance.</li>
     * <li>Template configurations: Objects with <code>matrix</code>
     *    and <code>template</code>
     *    properties for generating multiple configurations from a single
     *    definition.</li>
     * </ol>
     *
     * Template configuration names (containing `{{` markers) trigger matrix
     * expansion during initialisation, creating concrete configurations from
     * the Cartesian product of matrix parameter values. Each configuration
     * can inherit from others, creating complex dependency hierarchies.
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
     * <ol>
     * <li>Known only after <code>XpmBuildConfigurations.initialise</code>
     *    completes.</li>
     * <li>Possibly empty if there are no build configurations defined.</li>
     * <li>Values can be <code>undefined</code> to indicate a configuration
     *    exists but hasn't been instantiated yet (lazy loading).</li>
     * <li>For template configurations, contains one entry per expanded
     *    combination, not the original template definition.</li>
     * </ol>
     *
     * Configurations transition from `undefined` to instantiated when first
     * accessed via {@link XpmBuildConfigurations.get}, implementing the
     * lazy evaluation pattern to avoid unnecessary processing.
     */
    protected readonly _buildConfigurationsMap: Map<string, XpmBuildConfiguration | undefined>;
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
     * <ol>
     * <li>For regular configurations: Maps configuration name to itself
     *    (identity mapping).</li>
     * <li>For template configurations: Maps each generated configuration name
     *    back to the original template name (e.g., <code>release-x64</code> →
     *    <code>release-\{\{ matrix.arch \}\}</code>).</li>
     * <li>Known only after <code>XpmBuildConfigurations.initialise</code>
     *    completes.</li>
     * <li>Enables <code>XpmBuildConfigurations.get</code> to locate the
     *    correct JSON definition when instantiating a configuration on
     *    demand.</li>
     * </ol>
     *
     * This indirection is essential for lazy evaluation, allowing deferred
     * instantiation while maintaining the connection to original definitions.
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
     * <ol>
     * <li>Explicit duplicates in package.json with identical names.</li>
     * <li>Template expansion conflicts where different templates generate the
     *    same concrete configuration name.</li>
     * <li>Conflicts between template-generated names and explicitly defined
     *    configuration names.</li>
     * </ol>
     *
     * Detection occurs during {@link XpmBuildConfigurations.initialise},
     * throwing {@link XpmError} when duplicates are found to ensure
     * configuration name uniqueness.
     */
    protected readonly _buildComfigurationsNamesSet: Set<string>;
    /**
     * Flag indicating whether the collection has been initialised.
     *
     * @remarks
     * This flag prevents redundant initialisation and ensures idempotent
     * behavior when {@link XpmBuildConfigurations.initialise} is called
     * multiple times.
     *
     * State transitions:
     *
     * <ol>
     * <li>Initially <code>false</code> after construction.</li>
     * <li>Set to <code>true</code> after successful template expansion
     *    and configuration
     *    name registration.</li>
     * <li>Checked at the beginning of
     *    <code>XpmBuildConfigurations.initialise</code> to return early if
     *    already initialised.</li>
     * </ol>
     *
     * This pattern supports safe repeated calls during complex initialisation
     * sequences without duplicating work or corrupting internal state.
     */
    protected _isInitialised: boolean;
    /**
     * Constructs a build configurations collection.
     *
     * @remarks
     * The constructor performs partial initialisation. Complete
     * initialisation requires calling
     * {@link XpmBuildConfigurations.initialise}.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param engine - The Liquid templating engine for variable substitution.
     * @param substitutionsVariables - The variables available for substitution.
     * @param jsonBuildConfigurations - The JSON build configurations definitions,
     * or undefined if no build configurations are defined.
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
     * initialised via {@link XpmBuildConfiguration.initialise}, and only
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
     */
    initialise(): Promise<boolean>;
    /**
     * Determines whether the collection is empty.
     *
     * @returns `true` if there are no build configurations, `false` otherwise.
     */
    empty(): boolean;
    /**
     * Retrieves the names of all build configurations.
     *
     * @returns An array of build configuration names.
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
     */
    getJsonName(buildConfigurationName: string): string;
    /**
     * Determines whether a JSON definition exists for a build configuration.
     *
     * @param buildConfigurationName - The build configuration name to check.
     * @returns `true` if a JSON definition exists, `false` otherwise.
     */
    hasJson(buildConfigurationName: string): boolean;
    /**
     * Retrieves the JSON build configuration definition.
     *
     * @param buildConfigurationName - The build configuration name to resolve.
     * @returns The JSON build configuration definition.
     */
    getJson(buildConfigurationName: string): JsonBuildConfiguration;
    /**
     * Determines whether a build configuration is hidden.
     *
     * @param buildConfigurationName - The build configuration name to check.
     * @returns `true` if the configuration is hidden, `false` otherwise.
     */
    isHidden(buildConfigurationName: string): boolean;
    /**
     * Determines whether a build configuration exists in the collection.
     *
     * @param buildConfigurationName - The build configuration name to check.
     * @returns `true` if the configuration exists, `false` otherwise.
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
     * <ol>
     * <li>During collection initialisation
     *    (<code>XpmBuildConfigurations.initialise</code>), only the
     *    matrix of options is evaluated for each template, expanding
     *    configuration names without processing their content.</li>
     * <li>Later, when a configuration is accessed via this method and
     *    subsequently initialised
     *    (<code>XpmBuildConfiguration.initialise</code>), the template
     *    is fully evaluated and Liquid substitutions are performed on
     *    all properties.</li>
     * </ol>
     *
     * This approach ensures that only build configurations that are
     * actually used incur the cost of template evaluation and variable
     * substitution.
     *
     * @param buildConfigurationName - The build configuration name to retrieve.
     * @returns The build configuration instance.
     */
    get(buildConfigurationName: string): XpmBuildConfiguration;
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
     * <ol>
     * <li>Validates matrix structure (object with array values).</li>
     * <li>Validates template format (must be a JSON object).</li>
     * <li>Performs Liquid substitutions on matrix values if they contain
     *    template syntax.</li>
     * <li>Recursively generates all combinations using Cartesian product.</li>
     * <li>Creates a configuration instance for each combination with matrix
     *    parameters stored for later full evaluation.</li>
     * </ol>
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
     */
    protected _expandTemplateBuildConfigurations({ buildConfigurationName, jsonBuildConfigurationTemplate, }: {
        buildConfigurationName: string;
        jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate;
    }): Promise<Map<string, XpmBuildConfiguration>>;
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
 * <ol>
 * <li>Undefined: Name is known but instance not yet created.</li>
 * <li>Instantiated: Object exists but not yet fully processed.</li>
 * <li>Initialised: Inheritance resolved, properties evaluated, dependencies
 *    substituted, and actions prepared.</li>
 * </ol>
 *
 * Inheritance is processed recursively with circular reference detection.
 * Later inherited properties override earlier ones, and local properties
 * override all inherited ones. Dependencies and actions are merged from
 * all inherited configurations.
 */
export declare class XpmBuildConfiguration {
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
     * <ol>
     * <li>User-facing identification when listing or selecting
     *   configurations.</li>
     * <li>Build folder path generation (default:
     *   <code>build/\{name\}</code>).</li>
     * <li>Logging and diagnostic output to track configuration lifecycle.</li>
     * <li>Inheritance references from other configurations.</li>
     * </ol>
     *
     * Names must be unique within the configurations collection, enforced
     * during {@link XpmBuildConfigurations.initialise}.
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
     * <ol>
     * <li>Undefined for regular (non-template) configurations.</li>
     * <li>Set to the template name for configurations generated from matrix
     *    expansion.</li>
     * <li>Used to determine whether full JSON substitution is needed during
     *    initialisation (templates require complete substitution, regular
     *    configurations only substitute specific fields).</li>
     * <li>Enables tracing and debugging of template expansion process.</li>
     * </ol>
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
     * <ol>
     * <li>Liquid templating engine for variable substitution.</li>
     * <li>Base substitution variables hierarchy (package metadata,
     *    environment, platform detection).</li>
     * <li>Logger instance for diagnostic output.</li>
     * <li>JSON build configurations lookup for inheritance resolution.</li>
     * <li>Other configuration instances when processing inheritance chains.</li>
     * </ol>
     *
     * This design enables configurations to access shared resources without
     * duplicating them, while supporting complex inheritance relationships
     * where configurations reference and inherit from each other.
     */
    readonly parentBuildConfigurations: XpmBuildConfigurations;
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
     * <ol>
     * <li>Populated from <code>inherits</code> or deprecated
     *    <code>inherit</code> field during
     *    initialisation.</li>
     * <li>Supports both string (single parent) and array (multiple parents)
     *    formats.</li>
     * <li>Each inherited configuration is initialised recursively before
     *    merging its properties, dependencies, and actions.</li>
     * <li>Circular references are detected and rejected with
     *    <code>XpmInputError</code>.</li>
     * <li>Later inherited configurations override properties from earlier
     *    ones, and local properties override all inherited ones.</li>
     * </ol>
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
     * <ol>
     * <li>Hidden configurations don't compute build folder relative paths
     *    during initialisation (optimization for inheritance-only configs).</li>
     * <li>May be excluded from user-facing configuration lists depending on
     *    application logic.</li>
     * <li>Still fully initialised and available for inheritance by other
     *    configurations.</li>
     * <li>Derived from <code>hidden</code> field in JSON configuration definition
     *    (defaults to <code>false</code>).</li>
     * </ol>
     *
     * Common use case: Base configurations that define common properties,
     * dependencies, or actions inherited by multiple concrete configurations.
     */
    readonly isHidden: boolean;
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
     * <ol>
     * <li>Start with empty object.</li>
     * <li>Merge properties from each inherited configuration in sequence
     *    (later overrides earlier).</li>
     * <li>Merge local properties from JSON definition (overrides all
     *    inherited).</li>
     * <li>Add computed <code>buildFolderRelativePath</code> property
     *    for non-hidden
     *    configurations.</li>
     * </ol>
     *
     * Properties are accessible in templates as `{{ properties.key }}` and
     * commonly used for compiler flags, toolchain paths, optimization
     * settings, and build-specific configuration values.
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
     * <ol>
     * <li>Start with empty object.</li>
     * <li>Merge dependencies from each inherited configuration in sequence
     *    (later overrides earlier).</li>
     * <li>Merge local dependencies from JSON definition.</li>
     * <li>Perform Liquid template substitution on the entire dependencies
     *    object with full configuration context (properties, matrix, etc.).</li>
     * </ol>
     *
     * This enables configuration-specific dependencies with dynamic version
     * ranges or package selection based on matrix parameters, platform
     * detection, or configuration properties.
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
     * <ol>
     * <li>Start with empty object.</li>
     * <li>Merge devDependencies from each inherited configuration in sequence
     *    (later overrides earlier).</li>
     * <li>Merge local devDependencies from JSON definition.</li>
     * <li>Perform Liquid template substitution on the entire devDependencies
     *    object with full configuration context.</li>
     * </ol>
     *
     * Typical use: Test frameworks, build tools, or debugging utilities
     * specific to certain configurations (e.g., debug builds might include
     * additional analysis tools).
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
     * <ol>
     * <li>Enable external modification (e.g., `xpm uninstall` updates this
     *    directly).</li>
     * <li>Support deferred template evaluation during
     *    <code>XpmBuildConfiguration.initialise</code>.</li>
     * <li>Provide the source for inheritance when other configurations
     *    reference this one.</li>
     * <li>Allow re-evaluation with different variable contexts if needed.</li>
     * </ol>
     *
     * This immutable storage ensures configurations can be safely referenced
     * during inheritance resolution without side effects.
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
     * <ol>
     * <li>Starts with parent collection's base variables (env, os, path,
     *    package).</li>
     * <li>Extended with <code>properties</code>: Merged from inheritance
     *    chain and local
     *    properties.</li>
     * <li>Extended with <code>matrix</code>: Parameter values for
     *    template-generated
     *    configurations.</li>
     * <li>Extended with <code>configuration</code>: The configuration
     *    object itself
     *    (name, dependencies, properties) accessible for self-reference.</li>
     * </ol>
     *
     * This complete context is used for all substitutions within the
     * configuration: properties, dependencies, devDependencies, and actions.
     */
    protected _substitutionsVariables: XpmLiquidSubstitutionsVariables;
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
     * <ol>
     * <li>Undefined for regular (non-template) configurations.</li>
     * <li>For template configurations, contains key-value pairs from the matrix
     *    combination (e.g.,
     *   <code>\{ arch: 'x64', optimize: 'speed' \}</code>).</li>
     * <li>Merged into substitution variables during initialisation, making
     *    values accessible via the <code>matrix</code> namespace throughout the
     *    configuration.</li>
     * <li>Used in configuration name substitution, property values,
     *    dependencies, and action commands.</li>
     * </ol>
     *
     * Example: A template `release-{{ matrix.arch }}` with matrix parameters
     * `{ arch: 'x64' }` becomes the concrete configuration `release-x64`.
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
     * <ol>
     * <li>Undefined until <code>XpmBuildConfiguration.initialise</code> is
     *    called.</li>
     * <li>Collect actions from all inherited configurations in the inheritance
     *    chain.</li>
     * <li>Create new <code>XpmActions</code> collection with inherited
     *    actions map and local action definitions.</li>
     * <li>Actions inherit the configuration's substitution variables context,
     *    including properties and matrix parameters.</li>
     * </ol>
     *
     * Actions are accessible after configuration initialisation but remain
     * themselves uninitialised until retrieved and initialised individually,
     * maintaining the lazy evaluation pattern.
     */
    protected _actions: XpmActions | undefined;
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
     * <ol>
     * <li>Undefined until <code>XpmBuildConfiguration.initialise</code> is
     *    called.</li>
     * <li>Not computed for hidden configurations (optimization).</li>
     * <li>If <code>buildFolderRelativePath</code> property exists, perform Liquid
     *    substitution with full configuration context.</li>
     * <li>Otherwise, generate default path:
     *    <code>build/\{sanitized-config-name\}</code>.</li>
     * <li>Added to <code>properties.buildFolderRelativePath</code> for use
     *    in action
     *    commands and dependency references.</li>
     * </ol>
     *
     * The path is relative to the package root and used by build tools to
     * organize outputs from different configurations.
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
     * <ol>
     * <li>Initially empty when configuration initialisation begins.</li>
     * <li>Each inherited configuration name is added before processing that
     *    configuration's inheritance.</li>
     * <li>If a configuration attempts to inherit from a name already in the
     *    set, a circular reference exists.</li>
     * <li>Circular references trigger <code>XpmInputError</code> with details
     * about    the problematic inheritance chain.</li>
     * </ol>
     *
     * Example: If config A inherits from B, B from C, and C from A, the
     * circular dependency is detected when C attempts to inherit from A.
     */
    protected _inheritedNamesSet: Set<string>;
    /**
     * Flag indicating whether the configuration has been initialised.
     *
     * @remarks
     * This flag ensures idempotent initialization and prevents redundant
     * processing when {@link XpmBuildConfiguration.initialise} is called
     * multiple times.
     *
     * State transitions:
     *
     * <ol>
     * <li>Initially <code>false</code> after construction.</li>
     * <li>Set to <code>true</code> after successful inheritance resolution,
     *    property
     *    merging, dependency substitution, and action preparation.</li>
     * <li>Checked at the start of
     *    <code>XpmBuildConfiguration.initialise</code> to return early if
     *    already initialised.</li>
     * </ol>
     *
     * This pattern is critical for inheritance processing, as configurations
     * may be initialised multiple times when referenced by multiple children,
     * but should only process their inheritance chain once.
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
     * <ol>
     * <li>Template configurations (<code>isTemplate === true</code>):
     *   <ul>
     *   <li>Entire JSON configuration is stringified and substituted.</li>
     *   <li>Matrix parameters available throughout all fields.</li>
     *   <li>More expensive but supports matrix references anywhere.</li>
     *   </ul>
     * </li>
     * <li>Regular configurations (<code>isTemplate === false</code>):
     *   <ul>
     *   <li>Only <code>inherits</code> field is substituted initially.</li>
     *   <li>Other fields processed selectively during inheritance
     *     resolution.</li>
     *   <li>More efficient for configurations without matrix parameters.</li>
     *   </ul>
     * </li>
     * </ol>
     *
     * Set to `true` when `templateBuildConfigurationName` is defined,
     * indicating the configuration was generated from a template expansion.
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
     * requires calling {@link XpmBuildConfiguration.initialise}.
     */
    constructor({ buildConfigurationName, templateBuildConfigurationName, jsonBuildConfiguration, parentBuildConfigurations, matrixParameters, }: {
        buildConfigurationName: string;
        templateBuildConfigurationName?: string;
        jsonBuildConfiguration: JsonBuildConfigurationContent;
        parentBuildConfigurations: XpmBuildConfigurations;
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
     * <ol>
     * <li>For template configurations: Substitute matrix parameters throughout
     *    the entire JSON structure.</li>
     * <li>For non-template configurations: Substitute only the inherits
     * field.</li>
     * <li>Process inheritance chain recursively with circular reference
     *    detection.</li>
     * <li>Merge properties, dependencies, and devDependencies from inherited
     *    configurations (later overrides earlier).</li>
     * <li>Apply local properties and update substitution variables context.</li>
     * <li>For visible configurations: Compute build folder relative path.</li>
     * <li>Substitute Liquid templates in dependencies and devDependencies.</li>
     * <li>Create actions collection with inherited actions and local
     * actions.</li>
     * </ol>
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
     */
    initialise(): Promise<boolean>;
    /**
     * Retrieves the actions collection for this build configuration.
     *
     * @returns The actions collection.
     *
     * @throws `AssertionError`
     * If the configuration has not been initialised.
     */
    get actions(): XpmActions;
    /**
     * Retrieves the build folder relative path for this configuration.
     *
     * @returns The build folder relative path.
     *
     * @throws `AssertionError`
     * If the configuration has not been initialised.
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
     * <ol>
     * <li>Check if buildFolderRelativePath property exists in configuration
     *    properties.</li>
     * <li>If present and non-empty, perform Liquid substitutions with the
     *    full configuration context.</li>
     * <li>If substitution fails or property is empty/missing, generate a
     *    default path: `build/{filtered-configuration-name}` where the
     *    configuration name is sanitized for filesystem compatibility.</li>
     * </ol>
     *
     * The computed path is added back to the properties as
     * `buildFolderRelativePath` for use in subsequent substitutions.
     *
     * @returns A promise that resolves to the build folder relative path.
     */
    protected _getBuildFolderRelativePath(): Promise<string>;
}
//# sourceMappingURL=build-configurations.d.ts.map