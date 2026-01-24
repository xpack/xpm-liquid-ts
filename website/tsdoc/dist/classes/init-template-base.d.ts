import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { XpmContext } from '../types/xpm.js';
import { XpmInitTemplatePropertiesDefinitions, XpmInitTemplateSubstitutionsVariables } from '../types/xpm-init-template.js';
/**
 * Base class for xpm initialisation templates.
 *
 * @remarks
 * This abstract class provides the foundation for template-based project
 * initialisation. It handles the complete workflow: property validation,
 * interactive user prompts for missing mandatory values, variable
 * substitution, and file generation using the Liquid templating engine.
 *
 * Template workflow:
 *
 * 1. Properties are validated against their definitions
 *
 * 2. Missing mandatory properties trigger interactive prompts (if TTY)
 *
 * 3. Substitution variables are prepared from properties
 *
 * 4. The {@link XpmInitTemplateBase.generate} method creates project files
 *
 * Derived classes must implement {@link XpmInitTemplateBase.generate}
 * to define the specific files and folder structure to create.
 */
export declare abstract class XpmInitTemplateBase {
    /**
     * The xpm context containing configuration and logging utilities.
     */
    context: XpmContext;
    /**
     * The logger instance for output and diagnostics.
     */
    log: Logger;
    /**
     * Definitions of all properties supported by this template.
     */
    propertiesDefinitions: XpmInitTemplatePropertiesDefinitions;
    /**
     * The absolute path to the module folder.
     */
    __dirname: string;
    /**
     * The absolute path to the templates folder.
     */
    templatesPath: string;
    /**
     * The Liquid templating engine instance.
     */
    engine: Liquid;
    /**
     * The variables to be used for template substitutions.
     */
    substitutionsVariables?: XpmInitTemplateSubstitutionsVariables;
    /**
     * Constructs an xpm initialisation template instance.
     *
     * @param context - The xpm context containing configuration and logging.
     * @param __dirname - The absolute path to the module folder.
     * @param templatesPath - The absolute path to the templates folder.
     * @param propertiesDefinitions - The definitions of all supported properties.
     */
    constructor({ context, __dirname, templatesPath, propertiesDefinitions, }: {
        context: XpmContext;
        __dirname: string;
        templatesPath: string;
        propertiesDefinitions: XpmInitTemplatePropertiesDefinitions;
    });
    /**
     * Executes the template initialisation process.
     *
     * @remarks
     * This method orchestrates the complete template initialisation workflow.
     * It validates all provided properties, determines whether interactive
     * mode is required (when mandatory properties are missing), prompts for
     * missing values if in a TTY environment, prepares substitution variables
     * including the current year, and invokes the template-specific
     * {@link XpmInitTemplateBase.generate} method to create project files.
     *
     * The method automatically applies default values to optional properties
     * that were not explicitly set. In interactive mode, the timer is reset
     * after user input to exclude interactive time from performance metrics.
     *
     * @returns A promise that resolves to 0 on success.
     *
     * @throws {@link XpmSyntaxError}
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
     * Implementations should use {@link XpmInitTemplateBase.copyFile},
     * {@link XpmInitTemplateBase.copyFolder}, and
     * {@link XpmInitTemplateBase.render} to create the project structure.
     * The substitution variables are available via the
     * {@link XpmInitTemplateBase.substitutionsVariables} property.
     *
     * @param isInteractive - Whether the template was run in interactive mode.
     * @returns A promise that resolves when generation is complete.
     */
    abstract generate(isInteractive: boolean): Promise<void>;
    /**
     * Validates a property value against its definition.
     *
     * @remarks
     * This method checks whether the provided value is valid for the
     * specified property according to its type definition. It performs
     * type-specific validation and conversion:
     *
     * - For `select` properties: validates against allowed items and
     *   checks platform compatibility if specified
     *
     * - For `boolean` properties: converts 'true'/'false' strings to booleans
     *
     * - For `number` properties: converts strings to numbers
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
     * @throws `Error`
     * If the property is unsupported or the value is invalid.
     */
    validateValue(name: string, value: string): string | boolean | number;
    /**
     * Prompts the user interactively for missing property values.
     *
     * @remarks
     * This method creates a readline interface and iteratively prompts the
     * user to provide values for properties without explicit values. For
     * each property, the prompt displays:
     *
     * - The property label
     *
     * - Valid options (for select and boolean types)
     *
     * - The default value in brackets, if available
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
    askForMoreValues(): Promise<void>;
    /**
     * Determines whether the current platform is supported.
     *
     * @remarks
     * This method checks platform compatibility using a two-tier matching
     * strategy. First, it looks for an exact match with the current
     * platform-architecture combination (e.g., 'darwin-arm64'). If not
     * found, it checks for a platform-only match (e.g., 'darwin'). Returns
     * false if the platforms array is undefined, empty, or contains no
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
     * {@link XpmInitTemplateBase.render} instead if variable substitution
     * is needed.
     *
     * @param sourceFileRelativePath - The relative path to the source file
     * within the templates folder.
     * @param destinationFilePath - The destination file path (defaults to
     * the same relative path as the source).
     * @returns A promise that resolves when the file has been copied.
     */
    copyFile(sourceFileRelativePath: string, destinationFilePath?: string): Promise<void>;
    /**
     * Copies an entire folder from the templates folder to the destination.
     *
     * @remarks
     * This method recursively copies the complete folder structure,
     * including all files and subfolders, from the source to the
     * destination. The entire folder tree is replicated, preserving the
     * relative paths and structure. Files are copied without
     * modifications; use {@link XpmInitTemplateBase.render} for
     * individual files that require variable substitution.
     *
     * @param source - The relative path to the source folder within the
     * templates folder.
     * @param destination - The destination folder path (defaults to the
     * same relative path as the source).
     * @returns A promise that resolves when the folder has been copied.
     */
    copyFolder(source: string, destination?: string): Promise<void>;
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
    protected _copyFolderRecursively(sourceFolderPath: string, destinationFolderPath: string): Promise<void>;
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
     * @param inputFileRelativePath - The relative path to the template
     * file within the templates folder.
     * @param outputFileRelativePath - The destination path for the rendered
     * file.
     * @param substitutionsVariables - The variables to use for template
     * substitutions (defaults to the instance's substitutionsVariables).
     * @returns A promise that resolves when the file has been rendered and
     * written.
     *
     * @throws {@link XpmOutputError}
     * If template rendering fails.
     */
    render(inputFileRelativePath: string, outputFileRelativePath: string, substitutionsVariables?: XpmInitTemplateSubstitutionsVariables): Promise<void>;
}
//# sourceMappingURL=init-template-base.d.ts.map