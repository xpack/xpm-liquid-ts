import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from './liquid-engine.js';
import { XpmLiquidSubstitutionsVariables, XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonActions, JsonActionContent, JsonActionTemplate } from '../types/json.js';
import { XpmLiquidBuildConfiguration } from './liquid-build-configurations.js';
/**
 * A collection of xpm actions for a build configuration or the entire package.
 *
 * @remarks
 * This class manages a collection of named actions, each containing one or
 * more commands to be executed. Actions can belong to a package or a build
 * configuration and support template-based definitions with matrix expansion
 * to generate multiple actions from a single template.
 *
 * Action lifecycle phases:
 *
 * <ol>
 * <li>Construction: Basic setup with optional inheritance from parent
 *   package.</li>
 * <li>Initialisation: Template name expansion without content evaluation.</li>
 * <li>Retrieval: On-demand instantiation when accessed via
 *   <code>get()</code>.</li>
 * <li>Action Initialisation: Liquid template evaluation and substitution.</li>
 * </ol>
 *
 * This multi-phase approach ensures efficient resource usage by deferring
 * expensive operations until actions are actually needed.
 */
export declare class XpmLiquidActions {
    /**
     * The logger instance for output and diagnostics.
     *
     * @remarks
     * This logger is used throughout the lifecycle of actions collection to
     * provide trace-level diagnostics for debugging template expansion, action
     * instantiation, and variable substitution. It enables visibility into the
     * lazy evaluation process without impacting runtime performance when tracing
     * is disabled.
     */
    readonly log: Logger;
    /**
     * The Liquid templating engine for variable substitution.
     *
     * @remarks
     * This engine instance is shared across all actions in the collection and
     * configured with custom filters for platform detection, path manipulation,
     * and xpm-specific operations. It's used during both template action name
     * expansion and later during individual action command substitution,
     * ensuring consistent template processing throughout the action lifecycle.
     */
    readonly engine: XpmLiquidEngine;
    /**
     * The variables available for substitution in action definitions.
     *
     * @remarks
     * This comprehensive variable hierarchy provides context for template
     * evaluation, including package metadata, build configuration properties,
     * environment variables, platform detection, and path utilities.
     *
     * The hierarchy structure:
     *
     * <ol>
     * <li>Base variables: <code>env</code>, <code>os</code>, <code>path</code>
     *   (always available).</li>
     * <li>Package variables: name, version, dependencies, devDependencies.</li>
     * <li>Configuration variables: build folder paths, compiler settings.</li>
     * <li>Properties: custom key-value pairs from package or configuration.</li>
     * <li>Matrix: parameter combinations for template-generated actions (added
     * per action during initialisation).</li>
     * </ol>
     *
     * These variables are accessible in Liquid templates using dot notation
     * (e.g., `{{ package.name }}`,
     * `{{ configuration.buildFolderRelativePath }}`).
     */
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    /**
     * The JSON object containing action definitions from the package manifest.
     *
     * @remarks
     * This object holds the raw action definitions as they appear in the
     * package.json `xpack.actions` section or within a build configuration's
     * actions. Action definitions can be:
     *
     * <ol>
     * <li>Simple strings: Single command to execute.</li>
     * <li>String arrays: Multiple commands executed sequentially.</li>
     * <li>Template objects: With <code>matrix</code> and <code>template</code>
     *   properties for
     *   generating multiple actions from a single definition.</li>
     * </ol>
     *
     * Template action names (containing `{{` markers) trigger matrix expansion
     * during initialisation, creating concrete actions from the Cartesian
     * product of matrix parameter values.
     */
    readonly jsonActions: JsonActions;
    /**
     * Map of action names to their corresponding action instances.
     *
     * @remarks
     * This map serves as the primary action registry, populated during
     * collection initialisation with entries for all discovered actions.
     *
     * Key characteristics:
     *
     * <ol>
     * <li>Known only after <code>XpmLiquidActions.initialise</code>
     *   completes.</li>
     * <li>Possibly empty if there are no actions defined.</li>
     * <li>Values can be <code>undefined</code> to indicate an action
     *   exists but hasn't
     *   been instantiated yet (lazy loading).</li>
     * <li>For template actions, contains one entry per expanded combination,
     *   not the original template definition.</li>
     * </ol>
     *
     * Actions transition from `undefined` to instantiated when first accessed
     * via {@link XpmLiquidActions.get}, implementing the lazy evaluation
     * pattern.
     */
    protected readonly _actionsMap: Map<string, XpmLiquidAction | undefined>;
    /**
     * Set of all action names for quick lookup.
     *
     * @remarks
     * This set provides O(1) existence checks for action names, enabling
     * efficient validation during template expansion and duplicate detection.
     *
     * Key characteristics:
     *
     * <ol>
     * <li>Known only after <code>XpmLiquidActions.initialise</code>
     *   completes.</li>
     * <li>Contains all action names including those generated from
     *   templates.</li>
     * <li>Used to detect duplicate action names that might arise from template
     *   expansion conflicts or explicit duplicates in package.json.</li>
     * </ol>
     *
     * This redundant storage (alongside `_actionsMap`) is justified by the
     * performance benefit for name existence checks, especially in packages
     * with many actions.
     */
    protected readonly _actionsNamesSet: Set<string>;
    /**
     * Map of expanded action names to their original JSON action names.
     *
     * @remarks
     * This reverse mapping enables retrieving the original action definition
     * from `jsonActions` when lazy-loading action instances.
     *
     * Mapping behavior:
     *
     * <ol>
     * <li>For regular actions: Maps action name to itself (identity
     *   mapping).</li>
     * <li>For template actions: Maps each generated action name back to the
     *   original template name (e.g.,
     *   <code>test-x64</code> → <code>test-\{\{ matrix.arch \}\}</code>).</li>
     * <li>Enables <code>XpmLiquidActions.get</code> to locate the correct JSON
     *   definition when instantiating an action on demand.</li>
     * </ol>
     *
     * This indirection is essential for the lazy evaluation pattern, allowing
     * deferred instantiation while maintaining the connection to original
     * definitions.
     */
    protected readonly _jsonActionsNamesMap: Map<string, string>;
    /**
     * The build configuration this actions collection belongs to, if any.
     *
     * @remarks
     * This optional reference establishes the hierarchical relationship between
     * actions and build configurations, affecting variable substitution scope
     * and action inheritance.
     *
     * When defined:
     *
     * <ol>
     * <li>Actions inherit configuration-specific variables (build folder paths,
     *   compiler settings, toolchain properties).</li>
     * <li>Actions belong to a specific configuration namespace rather than the
     *   package root.</li>
     * <li>Logging and diagnostics include the configuration name for
     *   context.</li>
     * </ol>
     *
     * When `undefined`:
     *
     * <ol>
     * <li>Actions belong to the package root (<code>xpack.actions</code> in
     *   package.json).</li>
     * <li>Only package-level and global variables are available for
     *  substitution.</li>
     * </ol>
     */
    readonly buildConfiguration: XpmLiquidBuildConfiguration | undefined;
    /**
     * Flag indicating whether the actions collection has been initialised.
     *
     * @remarks
     * This flag prevents redundant initialisation and ensures idempotent
     * behavior when {@link XpmLiquidActions.initialise} is called multiple
     * times.
     *
     * State transitions:
     *
     * <ol>
     * <li>Initially <code>false</code> after construction.</li>
     * <li>Set to <code>true</code> after successful template expansion and
     *   action name
     *   registration.</li>
     * <li>Checked at the beginning of <code>XpmLiquidActions.initialise</code> to
     *   return early if already initialised.</li>
     * </ol>
     *
     * This pattern supports safe repeated calls during complex initialisation
     * sequences without duplicating work or corrupting internal state.
     */
    protected _isInitialised: boolean;
    /**
     * Constructs an actions collection instance.
     *
     * @remarks
     * The constructor performs partial initialisation. Complete initialisation
     * requires calling the {@link XpmLiquidActions.initialise} method.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param engine - The Liquid templating engine for variable substitution.
     * @param substitutionsVariables - The variables available for substitution.
     * @param inheritedActionsMap - Optional map of actions inherited from a
     * parent package.
     * @param jsonActions - The JSON object containing action definitions, or
     * undefined if no actions are defined.
     * @param buildConfiguration - Optional build configuration this actions
     * collection belongs to.
     */
    constructor({ log, engine, substitutionsVariables, inheritedActionsMap, jsonActions, buildConfiguration, }: {
        log: Logger;
        engine: XpmLiquidEngine;
        substitutionsVariables: XpmLiquidSubstitutionsVariables;
        inheritedActionsMap?: Map<string, XpmLiquidAction>;
        jsonActions: JsonActions | undefined;
        buildConfiguration?: XpmLiquidBuildConfiguration;
    });
    /**
     * Completes the async initialisation of the actions collection.
     *
     * @remarks
     * This method implements the first step of lazy evaluation. It processes
     * all action definitions by expanding template action names based on matrix
     * parameters, but does not evaluate the action content or perform Liquid
     * substitutions. The actual template evaluation and variable substitution
     * occur later when individual actions are initialised via
     * {@link XpmLiquidAction.initialise}, and only for actions that are
     * actually used. This approach avoids unnecessary operations on unused
     * actions. The method also validates that all expanded action names are
     * unique.
     *
     * @returns A promise that resolves to `true` if initialisation was
     * performed, or `false` if already initialised.
     *
     * @throws {@link XpmError}
     * If duplicate action names are detected or if template expansion fails.
     */
    initialise(): Promise<boolean>;
    /**
     * Determines whether the actions collection is empty.
     *
     * @remarks
     * This value is known only after initialisation.
     *
     * @returns `true` if there are no actions, `false` otherwise.
     */
    empty(): boolean;
    /**
     * Retrieves the names of all actions in the collection.
     *
     * @remarks
     * This value is known only after initialisation.
     *
     * @returns An array of action names.
     */
    names(): string[];
    /**
     * Checks whether an action with the specified name exists.
     *
     * @remarks
     * This value is known only after initialisation.
     *
     * @param actionName - The name of the action to check.
     * @returns `true` if the action exists, `false` otherwise.
     */
    has(actionName: string): boolean;
    /**
     * Retrieves an action by name, creating it if not yet instantiated.
     *
     * @remarks
     * This method implements lazy evaluation to avoid unnecessary operations.
     * Actions are instantiated on demand but remain uninitialised until actually
     * used. The two-step process works as follows:
     *
     * <ol>
     * <li>During collection initialisation
     *   (<code>XpmLiquidActions.initialise</code>),
     *   only the matrix of options is evaluated for each template, expanding
     *   only the action names without processing their content.</li>
     * <li>Later, when an action is accessed via this method and subsequently
     *   initialised (<code>XpmLiquidAction.initialise</code>), the template is
     *   fully evaluated and Liquid substitutions are performed on the
     *   commands.</li>
     * </ol>
     *
     * This approach ensures that only actions that are actually used incur the
     * cost of template evaluation and variable substitution.
     *
     * @param actionName - The name of the action to retrieve.
     * @returns The action instance.
     */
    get(actionName: string): XpmLiquidAction;
    /**
     * Expands a template action into multiple concrete actions.
     *
     * @remarks
     * This method computes the Cartesian product of all matrix parameter values
     * and creates a separate action for each combination, substituting matrix
     * values into both the action name and command templates.
     *
     * Processing steps:
     *
     * <ol>
     * <li>Validates matrix structure (object with array values).</li>
     * <li>Validates template format (string or array).</li>
     * <li>Performs Liquid substitutions on matrix values if they contain
     *   template syntax.</li>
     * <li>Recursively generates all combinations using Cartesian product.</li>
     * <li>Creates an action instance for each combination with matrix
     *   parameters available for later substitution.</li>
     * </ol>
     *
     * Matrix variables are scoped to individual actions and accessible via
     * the `matrix` namespace during action command evaluation.
     *
     * @param actionName - The template action name containing Liquid variables.
     * @param jsonActionTemplate - The JSON action template definition containing
     * matrix parameters and a template.
     * @returns A promise that resolves to a map of expanded action names to
     * their corresponding action instances.
     *
     * @throws {@link XpmError}
     * If the matrix structure is invalid, template format is incorrect, or
     * substitution fails.
     */
    protected _expandTemplateActions({ actionName, jsonActionTemplate, }: {
        actionName: string;
        jsonActionTemplate: JsonActionTemplate;
    }): Promise<Map<string, XpmLiquidAction>>;
}
/**
 * An individual xpm action containing commands to be executed.
 *
 * @remarks
 * Actions are lazily initialised, with variable substitution performed
 * only when the action is first retrieved and initialised. This allows for
 * efficient handling of large numbers of actions generated
 * from templates.
 *
 * An action can exist in three states:
 *
 * <ol>
 * <li>Undefined: Name is known but instance not yet created.</li>
 * <li>Instantiated: Object exists but commands not yet evaluated.</li>
 * <li>Initialised: Commands fully evaluated with Liquid substitutions.</li>
 * </ol>
 *
 * This design minimizes memory usage and computation for actions that are
 * defined but never executed, which is common when using matrix templates
 * to generate platform-specific or configuration-specific actions.
 */
export declare class XpmLiquidAction {
    /**
     * The name of the action.
     *
     * @remarks
     * This is the final, expanded action name used for identification and
     * execution. For template-generated actions, this is the concrete name
     * after matrix substitution (e.g., `test-x64` rather than
     * `test-{{ matrix.arch }}`).
     *
     * The name is used for:
     *
     * <ol>
     * <li>User-facing identification when listing or executing actions.</li>
     * <li>Logging and diagnostic output to track action lifecycle.</li>
     * <li>Creating copies of inherited actions with preserved names.</li>
     * </ol>
     *
     * Names must be unique within the actions collection, enforced during
     * {@link XpmLiquidActions.initialise}.
     */
    readonly actionName: string;
    /**
     * The JSON definition of the action commands.
     *
     * @remarks
     * This holds the raw command definition as it appears in package.json,
     * before variable substitution. The format can be:
     *
     * <ol>
     * <li>Simple string: Single command line.</li>
     * <li>String array: Multiple commands for sequential execution.</li>
     * </ol>
     *
     * The definition is preserved in its original form to enable:
     *
     * <ol>
     * <li>Creating copies of inherited actions with identical definitions.</li>
     * <li>Deferred template evaluation during
     * <code>XpmLiquidAction.initialise</code>.</li>
     * <li>Re-evaluation if needed with different variable contexts.</li>
     * </ol>
     *
     * This immutable storage ensures actions can be safely copied and
     * initialised multiple times without side effects.
     */
    readonly jsonAction: JsonActionContent;
    /**
     * The parent actions collection this action belongs to.
     *
     * @remarks
     * This reference maintains the hierarchical relationship between individual
     * actions and their containing collection, providing essential context for
     * action initialisation and execution.
     *
     * The parent collection provides access to:
     *
     * <ol>
     * <li>Liquid templating engine for variable substitution.</li>
     * <li>Substitution variables hierarchy (package metadata, configuration,
     *   environment, platform detection).</li>
     * <li>Logger instance for diagnostic output.</li>
     * <li>Build configuration context when actions belong to a specific
     *   configuration rather than the package root.</li>
     * </ol>
     *
     * This design enables actions to access shared resources without duplicating
     * them, while maintaining proper scoping for template evaluation. During
     * initialisation, the action combines parent-level substitution variables
     * with its own matrix parameters to create a complete context for Liquid
     * template processing.
     */
    readonly parentActions: XpmLiquidActions;
    /**
     * The matrix parameter values for template-generated actions.
     *
     * @remarks
     * For template-generated actions, this object contains the specific matrix
     * parameter values that produced this action instance from the template.
     *
     * Usage pattern:
     *
     * <ol>
     * <li>Undefined for regular (non-template) actions.</li>
     * <li>For template actions, contains key-value pairs from the matrix
     *   combination (e.g.,
     *   <code>\{ arch: 'x64', platform: 'linux' \}</code>).</li>
     * <li>Merged into substitution variables during
     *   <code>XpmLiquidAction.initialise</code>, making values accessible via the
     *   <code>matrix</code> namespace in command templates.</li>
     * <li>Enables the same command template to generate different concrete
     *   commands for each matrix combination.</li>
     * </ol>
     *
     * Example: A template with `{{ matrix.arch }}` becomes `x64` when this
     * action's matrix parameters include `{ arch: 'x64' }`.
     */
    protected readonly _matrixParameters?: XpmLiquidSubstitutionsStrings;
    /**
     * The array of command strings after variable substitution.
     *
     * @remarks
     * This array contains the fully evaluated command lines ready for
     * execution, with all Liquid template variables substituted.
     *
     * Lifecycle states:
     *
     * <ol>
     * <li>Undefined initially and until <code>XpmLiquidAction.initialise</code>
     *   is called.</li>
     * <li>Populated during initialisation by evaluating
     *   <code>jsonAction</code> with the
     *   Liquid engine and complete variable context.</li>
     * <li>Array-based JSON definitions are joined, substituted, then split back
     *   into individual command lines.</li>
     * <li>Each string represents one command line to be executed
     *   sequentially.</li>
     * </ol>
     *
     * Attempting to access via the `commands` getter before initialisation
     * will trigger an assertion error, enforcing correct usage order.
     */
    protected _commands?: string[];
    /**
     * Flag indicating whether the action has been initialised.
     *
     * @remarks
     * This flag ensures idempotent initialization and prevents redundant
     * template evaluation when {@link XpmLiquidAction.initialise} is called
     * multiple times.
     *
     * State transitions:
     *
     * <ol>
     * <li>Initially <code>false</code> after construction.</li>
     * <li>Set to <code>true</code> after successful command substitution and
     *   evaluation.</li>
     * <li>Checked at the start of <code>XpmLiquidAction.initialise</code> to
     *   return early if already initialised.</li>
     * </ol>
     *
     * This pattern allows safe repeated calls during complex initialization
     * sequences or when actions are accessed multiple times, avoiding the
     * computational cost of re-evaluating templates unnecessarily.
     */
    protected _isInitialised: boolean;
    /**
     * Constructs an action instance.
     *
     * @remarks
     * The constructor performs partial initialisation. Variable substitution
     * requires calling the {@link XpmLiquidAction.initialise} method.
     *
     * @param actionName - The name of the action.
     * @param jsonAction - The JSON definition of the action commands.
     * @param parentActions - The parent actions collection this action belongs
     * to.
     * @param matrixParameters - Optional matrix parameter values for
     * template-generated actions.
     */
    constructor({ actionName, jsonAction, parentActions, matrixParameters, }: {
        actionName: string;
        jsonAction: JsonActionContent;
        parentActions: XpmLiquidActions;
        matrixParameters?: XpmLiquidSubstitutionsStrings;
    });
    /**
     * Completes the async initialisation of the action.
     *
     * @remarks
     * This method performs variable substitution on the action commands using
     * the Liquid templating engine and the available substitution variables,
     * including any matrix parameters for template-generated actions.
     *
     * The substitution context includes:
     *
     * <ol>
     * <li>All package-level substitution variables (configuration, package
     *   metadata, platform detection, etc.).</li>
     * <li>Build configuration variables if this action belongs to a
     *   configuration.</li>
     * <li>Matrix parameters for template-generated actions, accessible via
     *   the <code>matrix</code> namespace (e.g.,
     *   <code>\{\{ matrix.arch \}\}</code>).</li>
     * </ol>
     *
     * Array-based command definitions are joined with newlines before
     * substitution, then split back into individual commands after processing.
     * This allows commands to span multiple array elements while maintaining
     * clean formatting in the package manifest.
     *
     * @returns A promise that resolves to `true` if initialisation was
     * performed, or `false` if already initialised.
     *
     * @throws {@link XpmError}
     * If command substitution fails.
     */
    initialise(): Promise<boolean>;
    /**
     * Retrieves the array of command strings for this action.
     *
     * @remarks
     * The action must be initialised via {@link XpmLiquidAction.initialise}
     * before accessing this property. Attempting to access commands from an
     * uninitialised action will result in an assertion error.
     *
     * @returns The array of command strings after variable substitution.
     *
     * @throws `AssertionError`
     * If the action has not been initialised.
     */
    get commands(): string[];
}
//# sourceMappingURL=liquid-actions.d.ts.map