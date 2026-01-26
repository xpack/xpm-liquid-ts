/**
 * Extracts an error message string from an unknown error value.
 *
 * @remarks
 * This utility handles error values of any type, extracting the message
 * property from `Error` instances or converting other types to strings.
 * Useful for consistent error reporting when the error type is unknown.
 *
 * TypeScript's catch clause types errors as `unknown` for safety, since
 * JavaScript allows throwing any value (not just `Error` instances). This
 * function provides a type-safe way to extract a message string:
 *
 * <ul>
 * <li><b>For Error instances:</b> Returns the <code>message</code>
 *    property.</li>
 * <li><b>For other types:</b> Converts to string using <code>String()</code>,
 *    which handles
 *    primitives, objects with <code>toString()</code>, <code>null</code>,
 *    and <code>undefined</code> gracefully.</li>
 * </ul>
 *
 * Common usage pattern:
 * ```typescript
 * try {
 *   // code that might throw
 * } catch (err) {
 *   const message = getErrorMessage(err);
 *   log.error(message);
 * }
 * ```
 *
 * @param error - The error value to convert.
 * @returns The error message string.
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Builds a unique key using the current platform and architecture.
 *
 * @remarks
 * Generates a platform identifier string used for matching binary packages
 * to the current system or for platform-specific configuration.
 *
 * Platform key format: `<platform>-<arch>`
 *
 * Examples:
 *
 * <ul>
 * <li><code>darwin-x64</code> (macOS on Intel)</li>
 * <li><code>darwin-arm64</code> (macOS on Apple Silicon)</li>
 * <li><code>linux-x64</code> (Linux on 64-bit Intel/AMD)</li>
 * <li><code>win32-x64</code> (Windows on 64-bit)</li>
 * </ul>
 *
 * 32-bit coercion rules (when doForce32bit is true):
 *
 * <ul>
 * <li><b>Windows x64 → ia32:</b> Forces 32-bit binaries on 64-bit Windows.</li>
 * <li><b>Linux x64 → ia32:</b> Forces 32-bit binaries on 64-bit Linux.</li>
 * <li><b>Linux arm64 → arm:</b> Forces 32-bit ARM binaries on 64-bit
 *    ARM Linux.</li>
 * </ul>
 *
 * This coercion is useful for backward compatibility scenarios where only
 * 32-bit binaries are available but can run on 64-bit systems. The
 * platform key matches the naming conventions used in binary xPack
 * distributions.
 *
 * @param doForce32bit - Whether to coerce certain 64-bit platforms to their
 * 32-bit equivalents.
 * @returns The platform key in the form `platform-arch`.
 */
export declare function getPlatformKey({ doForce32bit, }?: {
    doForce32bit?: boolean;
}): string;
//# sourceMappingURL=utils.d.ts.map