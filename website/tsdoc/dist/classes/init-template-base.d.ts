import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { InitTemplatePropertiesDefinitions, InitTemplateSubstitutionsVariables } from '../types/xpm-init-template.js';
import { Context } from '../types/xpm.js';
/**
 * Configuration parameters for constructing an `xpm init` template.
 *
 * @remarks
 * This interface defines the required configuration for creating an
 * instance of {@link InitTemplateBase} or its derived classes. All
 * properties are mandatory except for the optional `process` parameter,
 * parameter, which defaults to the global Node.js `process` object when
 * not specified.
 *
 * The parameters provide the template with access to the <b>xpm</b>
 * context, file system paths, property definitions, and the process
 * environment necessary for template operations.
 */
export interface InitTemplateConstructorParameters {
    /**
     * The <b>xpm</b> context containing configuration and logging utilities.
     */
    context: Context;
    /**
     * The absolute path to the module folder.
     */
    __dirname: string;
    /**
     * The absolute path to the templates folder.
     */
    templatesPath: string;
    /**
     * Definitions of all properties supported by this template.
     */
    propertiesDefinitions: InitTemplatePropertiesDefinitions;
    /**
     * The Node.js process object (defaults to the global `process`).
     * Intended for testing purposes to allow mocking of process properties
     * and methods.
     */
    process?: NodeJS.Process;
}
/**
 * Base class for `xpm init` templates.
 *
 * @remarks
 * This abstract class provides the foundation for template-based project
 * initialisation. It handles the complete workflow: property validation,
 * interactive user prompts for missing mandatory values, variable
 * substitution, and file generation using the Liquid templating engine.
 *
 * Template workflow:
 *
 * <ol>
 * <li>Properties are validated against their definitions</li>
 * <li>Missing mandatory properties trigger interactive prompts (if TTY)</li>
 * <li>Substitution variables are prepared from properties</li>
 * <li>The <code>InitTemplateBase.generate()</code> method creates project
 * files</li>
 * </ol>
 *
 * Derived classes must implement {@link InitTemplateBase.generate}
 * to define the specific files and folder structure to create.
 */
export declare abstract class InitTemplateBase {
    /**
     * The <b>xpm</b> context containing configuration and logging utilities.
     */
    protected _context: Context;
    /**
     * The logger instance for output and diagnostics.
     */
    protected _log: Logger;
    /**
     * Definitions of all properties supported by this template.
     */
    protected _propertiesDefinitions: InitTemplatePropertiesDefinitions;
    /**
     * The absolute path to the module folder.
     */
    protected __dirname: string;
    /**
     * The absolute path to the templates folder.
     */
    protected _templatesPath: string;
    /**
     * The Liquid templating engine instance.
     */
    protected _engine: Liquid;
    /**
     * The variables to be used for template substitutions.
     */
    protected _substitutionsVariables?: InitTemplateSubstitutionsVariables;
    protected _isInteractive: boolean;
    protected _process: NodeJS.Process;
    /**
     * Constructs an `xpm init` template instance.
     *
     * @param context - The <b>xpm</b> context containing configuration and
     *    logging.
     * @param __dirname - The absolute path to the module folder.
     * @param templatesPath - The absolute path to the templates folder.
     * @param propertiesDefinitions - The definitions of all supported properties.
     */
    constructor({ context, __dirname, templatesPath, propertiesDefinitions, process: _process, }: InitTemplateConstructorParameters);
    /**
     * Executes the template initialisation process.
     *
     * @remarks
     * This method orchestrates the complete template initialisation workflow.
     * It validates all provided properties, determines whether interactive
     * mode is required (when mandatory properties are missing), prompts for
     * missing values if in a TTY environment, prepares substitution variables
     * including the current year, and invokes the template-specific
     * {@link InitTemplateBase.generate} method to create project files.
     *
     * The method automatically applies default values to optional properties
     * that were not explicitly set. In interactive mode, the timer is reset
     * after user input to exclude interactive time from performance metrics.
     *
     * @returns A promise that resolves to 0 on success.
     *
     * @throws {@link JsonSyntaxError}
     * If property validation fails or interactive mode is required but not
     * available (non-TTY environment).
     */
    run(): Promise<number>;
    /**
     * Generates the project files from the template.
     *
     * @remarks
     * This abstract method must be implemented by derived classes to define
     * the specific files and folder structure to create for the project.
     * Implementations should use {@link InitTemplateBase.copyFile},
     * {@link InitTemplateBase.copyFolder}, and
     * {@link InitTemplateBase.render} to create the project structure.
     * The substitution variables are available via the
     * {@link InitTemplateBase._substitutionsVariables} property.
     *
     * The implementation must be <b>asynchronous</b> to allow for file system
     * operations.
     *
     * @returns A promise that resolves when generation is complete.
     */
    abstract generate(): Promise<void>;
    /**
     * Determines whether the current platform is supported.
     *
     * @remarks
     * This method checks platform compatibility using a two-tier matching
     * strategy. First, it looks for an exact match with the current
     * platform-architecture combination (e.g., `darwin-arm64`). If not
     * found, it checks for a platform-only match (e.g., `darwin`). Returns
     * `false` if the platforms array is undefined, empty, or contains no
     * matches for the current execution environment.
     *
     * @param platforms - The array of supported platform identifiers, or
     * undefined if no platforms are specified.
     * @returns `true` if the current platform is supported, `false`
     * otherwise.
     */
    isPlatformSupported(platforms: string[] | undefined): boolean;
    /**
     * Copies a single file from the templates folder to the destination.
     *
     * @remarks
     * This method resolves the source file path relative to the templates
     * folder and copies it to the destination, creating any necessary
     * parent directories. The file is copied without modifications,
     * preserving its content and structure. Use
     * {@link InitTemplateBase.render} instead if variable substitution
     * is needed.
     *
     * @param sourceFileRelativePath - The relative path to the source file
     * within the templates folder.
     * @param destinationFilePath - The destination file path (defaults to
     * the same relative path as the source).
     * @returns A promise that resolves when the file has been copied.
     */
    copyFile({ sourceFileRelativePath, destinationFilePath, }: {
        sourceFileRelativePath: string;
        destinationFilePath?: string;
    }): Promise<void>;
    /**
     * Copies an entire folder from the templates folder to the destination.
     *
     * @remarks
     * This method recursively copies the complete folder structure,
     * including all files and subfolders, from the source to the
     * destination. The entire folder tree is replicated, preserving the
     * relative paths and structure. Files are copied without
     * modifications; use {@link InitTemplateBase.render} for
     * individual files that require variable substitution.
     *
     * @param sourceFolderRelativePath - The relative path to the source folder
     * within the templates folder.
     * @param destinationFolderPath - The destination folder path (defaults to the
     * same relative path as the source).
     * @returns A promise that resolves when the folder has been copied.
     */
    copyFolder({ sourceFolderRelativePath, destinationFolderPath, }: {
        sourceFolderRelativePath: string;
        destinationFolderPath?: string;
    }): Promise<void>;
    /**
     * Renders a template file using Liquid and writes the output.
     *
     * @remarks
     * This method processes a template file through the Liquid templating
     * engine with the provided substitution variables, generating the final
     * output file. Parent directories are created automatically if they do
     * not exist. The template file should be located in the templates
     * folder and use Liquid syntax for variable references (e.g.,
     * `{{ variableName }}`).
     *
     * The substitution variables include all project properties plus
     * additional context like the current year. If substitutionsVariables
     * is not provided, the instance's substitutionsVariables property is
     * used.
     *
     * @param sourceFilePath - The absolute path to the template
     * file within the templates folder.
     * @param destinationFilePath - The destination path for the rendered
     * file.
     * @param substitutionsVariables - The variables to use for template
     * substitutions (defaults to the instance's substitutionsVariables).
     * @returns A promise that resolves when the file has been rendered and
     * written.
     *
     * @throws {@link OutputError}
     * If template rendering fails.
     */
    render({ sourceFilePath, destinationFilePath, substitutionsVariables, }: {
        sourceFilePath: string;
        destinationFilePath: string;
        substitutionsVariables?: InitTemplateSubstitutionsVariables;
    }): Promise<void>;
    /**
     * Validates a property value against its definition.
     *
     * @remarks
     * This method checks whether the provided value is valid for the
     * specified property according to its type definition. It performs
     * type-specific validation and conversion:
     *
     * <ul>
     * <li><b>For <code>select</code> properties:</b> validates against
     *    allowed items andchecks platform compatibility if specified</li>
     * <li><b>For <code>boolean</code> properties:</b> converts
     *    <code>'true'</code>/<code>'false'</code>
     *    strings to booleans</li>
     * <li><b>For <code>number</code> properties:</b> converts strings
     *    to numbers</li>
     * </ul>
     *
     * If the value is empty and a default is defined, the default value is
     * returned. For select properties with platform restrictions, only
     * platform-compatible items are considered valid.
     *
     * @param name - The property name to validate.
     * @param value - The property value to validate.
     * @returns The validated and potentially converted value (string,
     * boolean, or number).
     *
     * @throws {@link ConfigurationError}
     * If the property is unsupported or the value is invalid.
     */
    protected _validatePropertyValue(name: string, value: string): string | boolean | number;
    /**
     * Prompts the user interactively for missing property values.
     *
     * @remarks
     * This method creates a readline interface and iteratively prompts the
     * user to provide values for properties without explicit values. For
     * each property, the prompt displays:
     *
     * <ul>
     * <li>The property label</li>
     * <li>Valid options (for select and boolean types)</li>
     * <li>The default value in brackets, if available</li>
     * </ul>
     *
     * If the user enters '?', help text is displayed showing the property
     * description and all valid options with their descriptions. Invalid
     * responses are rejected and the prompt is repeated until a valid value
     * is provided. Platform-incompatible options are excluded from select
     * properties.
     *
     * @returns A promise that resolves when all missing values have been
     * collected.
     */
    protected _askForMoreValues(): Promise<void>;
    /**
     * Recursively copies all contents of a source folder to a destination folder.
     *
     * @remarks
     * This internal method traverses the source folder structure and replicates
     * it at the destination, copying all files and recursively processing
     * subfolders.
     *
     * @param sourceFolderPath - The absolute path to the source folder.
     * @param destinationFolderPath - The absolute path to the destination folder.
     * @returns A promise that resolves when all contents have been copied.
     */
    protected _copyFolderRecursively({ sourceFolderPath, destinationFolderPath, }: {
        sourceFolderPath: string;
        destinationFolderPath: string;
    }): Promise<void>;
    protected _validatePropertiesDefinitions(): void;
}
//# sourceMappingURL=init-template-base.d.ts.map