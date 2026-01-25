import { Liquid } from 'liquidjs';
/**
 * Liquid engine configured for xpm templates.
 *
 * @remarks
 * This class extends the Liquid engine and registers custom filters
 * for path manipulation, string formatting, and convenience helpers used across
 * xpm templates.
 *
 * The engine is configured with strict parsing options to catch template
 * errors early during development. Custom filters are organized into
 * categories:
 *
 * <ol>
 * <li>Path manipulation: Platform-specific and cross-platform path operations
 *    (basename, dirname, join, relative, normalize) for default, POSIX, and
 *    Win32 paths.</li>
 * <li>String formatting: Utilities for printf-style formatting and filename
 *    sanitization.</li>
 * <li>Array/string conversion: Filters for joining and splitting lines.</li>
 * <li>Object introspection: Filters for extracting object keys.</li>
 * </ol>
 *
 * These filters enable templates to perform complex path manipulations and
 * string transformations without requiring external dependencies or custom
 * template tags.
 */
export declare class XpmLiquidEngine extends Liquid {
    /**
     * Constructs a Liquid engine instance with xpm-specific settings and
     * filters.
     *
     * @remarks
     * The constructor configures strict parsing options and registers
     * filters for path handling, formatting, and list operations.
     *
     * Configuration options:
     *
     * <ul>
     * <li>strictFilters: Throw errors for undefined filters rather than
     *   silently ignoring them.</li>
     * <li>strictVariables: Throw errors for undefined variables rather than
     *   rendering empty strings.</li>
     * <li>trimTagLeft/Right: Preserve whitespace around template tags.</li>
     * <li>trimOutputLeft/Right: Preserve whitespace around output
     * expressions.</li>
     * <li>greedy: Use non-greedy matching for better template compatibility.</li>
     * <li>lenientIf: Allow flexible truthiness in conditional expressions.</li>
     * </ul>
     *
     * Filter registration:
     *
     * <ul>
     * <li>Platform-aware path filters (default, posix, win32) delegate to
     *   Node.js path module for consistent cross-platform behavior.</li>
     * <li>Custom filters (to_filename, join_lines, split_lines, keys) provide
     *   template-specific functionality not available in standard Liquid.</li>
     * <li>All filters are registered during construction for immediate
     *   availability in templates.</li>
     * </ul>
     */
    constructor();
}
//# sourceMappingURL=liquid-engine.d.ts.map