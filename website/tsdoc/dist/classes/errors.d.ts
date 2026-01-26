/**
 * Base class for xpm-related errors.
 *
 * @remarks
 * This class extends the standard JavaScript `Error` class and serves as
 * the foundation for all <b>xpm</b>-specific error types. Use this error for
 * general <b>xpm</b> operations that don't fit into more specific error
 * categories. More specialized errors ({@link XpmInputError},
 * {@link XpmSyntaxError}, {@link XpmOutputError},
 * {@link XpmPrerequisitesError}) should be preferred when applicable,
 * as they provide clearer semantics for error handling.
 */
export declare class XpmError extends Error {
}
/**
 * Error indicating that required prerequisites are not met.
 *
 * @remarks
 * This error is thrown when dependencies, tools, or system requirements
 * necessary for an operation are missing or incompatible. Common scenarios
 * include missing npm packages, unavailable system tools, unsupported
 * platform versions, or insufficient <b>xpm</b> version requirements. Use this
 * error when validation of the execution environment fails before
 * attempting an operation.
 */
export declare class XpmPrerequisitesError extends Error {
}
/**
 * Error indicating that user input is invalid.
 *
 * @remarks
 * This error is thrown when command-line arguments, configuration
 * values, or other user-provided input fails validation. Common scenarios
 * include invalid property values, missing required fields, circular
 * inheritance references, or out-of-range parameter values. The error
 * message should clearly indicate what input was invalid and why, helping
 * users correct their configuration or arguments.
 */
export declare class XpmInputError extends Error {
}
/**
 * Error indicating a syntax error in configuration or template files.
 *
 * @remarks
 * This error is thrown when parsing configuration files, Liquid template
 * syntax, JSON structures, or other formatted data encounters invalid
 * syntax. This typically occurs during the parsing phase before semantic
 * validation. Use this error when the structure of the input is
 * malformed, as opposed to {@link XpmInputError} which indicates
 * semantically invalid but syntactically correct input.
 */
export declare class XpmSyntaxError extends Error {
}
/**
 * Error indicating a failure during output generation.
 *
 * @remarks
 * This error is thrown when file generation, Liquid template rendering,
 * or other output operations fail. Common scenarios include template
 * evaluation errors, file system write failures, or variable substitution
 * problems. This error indicates that the input was valid but the
 * transformation or output process encountered a problem during execution.
 */
export declare class XpmOutputError extends Error {
}
//# sourceMappingURL=errors.d.ts.map