import { Logger } from '@xpack/logger';
/**
 * Represents a list of action command strings.
 *
 * @remarks
 * Action commands are always stored as an array of strings after Liquid
 * template evaluation, even if the original definition in package.json was
 * a single string.
 *
 * Each string represents a complete command to be executed in sequence.
 * Commands are typically shell commands but can be any executable that can
 * be invoked from the command line.
 *
 * The array structure enables:
 *
 * - Multi-step actions: Execute multiple commands in order.
 *
 * - Error handling: Stop execution on first command failure (default
 *   behavior).
 *
 * - Logging: Report progress as each command completes.
 *
 * Commands have access to the full shell environment and can reference
 * environment variables, pipe outputs, or chain operations using standard
 * shell syntax (&&, ||, |, etc.).
 *
 * @public
 */
export type XpmLiquidActionCommands = string[];
/**
 * Defines the xpm configuration options.
 *
 * @remarks
 * Configuration options control xpm operation behavior, providing flags for
 * safe mode overrides, installation optimizations, testing scenarios, and
 * property overrides.
 *
 * Configuration lifecycle:
 *
 * 1. Created from CLI arguments or programmatic API calls.
 *
 * 2. Merged with defaults to form complete configuration.
 *
 * 3. Passed through {@link XpmContext} to all xpm operations.
 *
 * 4. Consulted by operations to determine behavior (skip, force, dry-run).
 *
 * Key configuration patterns:
 *
 * - Force mode (`doForce: true`): Bypasses safety checks like "already
 *   installed" or "files exist". Use with caution as it can overwrite data.
 *
 * - Skip if installed (`doSkipIfInstalled: true`): Optimization to avoid
 *   reinstalling packages that are already present, useful for CI/CD.
 *
 * - Dry run (`isDryRun: true`): Simulates operations without making changes,
 *   useful for testing or previewing actions.
 *
 * - Property overrides: Command-line or API-provided properties that
 *   override values from package.json, enabling dynamic configuration.
 *
 * The extensible design (additional properties allowed) supports future
 * configuration options without breaking changes.
 *
 * @public
 */
export interface XpmConfig {
    /**
     * Whether to force operations even when safeguards would prevent them.
     *
     * @public
     */
    doForce?: boolean;
    /**
     * Whether to skip operations if the target is already installed.
     *
     * @public
     */
    doSkipIfInstalled?: boolean;
    /**
     * Whether to perform a dry run without making changes.
     *
     * @public
     */
    isDryRun?: boolean;
    /**
     * The properties map used for substitutions.
     *
     * @public
     */
    properties?: Record<string, string | boolean | number>;
    /**
     * Allows additional configuration properties.
     *
     * @public
     */
    [key: string]: unknown;
}
/**
 * Provides the execution context for xpm operations.
 *
 * @remarks
 * The context object serves as the central coordination point for all xpm
 * operations, providing access to logging, configuration, and extensible
 * state.
 *
 * Context flow:
 *
 * 1. Created at the start of each xpm command execution.
 *
 * 2. Initialized with logger instance and configuration options.
 *
 * 3. Passed to all library functions and classes that perform xpm
 *    operations.
 *
 * 4. Extended with additional properties as needed by specific operations
 *    (e.g., package paths, temporary directories, cache state).
 *
 * Core responsibilities:
 *
 * - Logging: Provides consistent output and diagnostics through the logger
 *   instance, enabling verbosity control and structured output.
 *
 * - Configuration: Makes operational flags and user preferences accessible
 *   to all components.
 *
 * - State sharing: The extensible design allows operations to attach
 *   computed values or state that should be available to subsequent
 *   operations within the same execution.
 *
 * The context pattern enables dependency injection, making the code more
 * testable and allowing operations to access shared resources without
 * global state.
 *
 * @public
 */
export interface XpmContext {
    /**
     * The logger instance for output and diagnostics.
     *
     * @public
     */
    log: Logger;
    /**
     * The xpm configuration options.
     *
     * @public
     */
    config: XpmConfig;
    /**
     * Allows additional context properties.
     *
     * @public
     */
    [key: string]: any;
}
//# sourceMappingURL=xpm.d.ts.map