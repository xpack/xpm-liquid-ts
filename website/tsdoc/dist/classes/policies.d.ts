import { Logger } from '@xpack/logger';
/**
 * Computes feature policy flags based on a minimum xpm version.
 *
 * @remarks
 * This class derives compatibility flags from a specified minimum
 * version to preserve legacy behaviour when required.
 *
 * Policy versioning allows xpm to evolve its behavior while maintaining
 * backward compatibility for packages that specify older minimum versions.
 * Each policy flag represents a breaking change introduced at a specific
 * xpm version:
 *
 * <ul>
 * <li>Packages with minimumXpmRequired \< version threshold get
 * legacy behavior.</li>
 * <li>Packages with minimumXpmRequired \>= version threshold get
 * new behavior.</li>
 * </ul>
 *
 * This approach ensures that:
 *
 * <ol>
 * <li>Existing packages continue to work with newer xpm versions without
 *    modification.</li>
 * <li>New packages can opt into modern behavior by specifying a recent
 *    minimumXpmRequired.</li>
 * <li>Breaking changes are tied to explicit version declarations rather than
 *    xpm installation version.</li>
 * </ol>
 *
 * Policy flags are evaluated once during initialization and cached for the
 * duration of the operation.
 */
export declare class XpmPolicies {
    /**
     * The minimum xpm version used to derive policy flags.
     */
    minVersion: string;
    /**
     * Indicates whether npm dependencies are shared across installations.
     *
     * @remarks
     * Legacy behavior (before 0.14.0): npm dependencies were shared in a global
     * location, similar to how npm itself works with global node_modules.
     *
     * Modern behavior (0.14.0+): npm dependencies are installed locally per
     * xpack, providing better isolation and avoiding version conflicts.
     *
     * Set to `true` for packages with minimumXpmRequired \< 0.14.0.
     */
    shareNpmDependencies: boolean;
    /**
     * Indicates whether local `xpacks` folders are non-hierarchical.
     *
     * @remarks
     * Legacy behavior (before 0.16.0): xpacks were stored in a flat structure
     * within the local `xpacks` folder.
     *
     * Modern behavior (0.16.0+): xpacks are organized hierarchically within
     * the `xpacks` folder, mirroring the scoped package structure (e.g.,
     * `xpacks/@scope/package`).
     *
     * Set to `true` for packages with minimumXpmRequired \< 0.16.0.
     */
    nonHierarchicalLocalXpacksFolder: boolean;
    /**
     * Indicates whether dependencies are restricted to string-only notation.
     *
     * @remarks
     * Legacy behavior (before 0.16.0): dependencies could only be specified as
     * strings (e.g., `"@scope/package": "1.0.0"`).
     *
     * Modern behavior (0.16.0+): dependencies can be specified as objects with
     * additional metadata (e.g., platforms, repositories), providing richer
     * dependency configuration.
     *
     * Set to `true` for packages with minimumXpmRequired \< 0.16.0.
     */
    onlyStringDependencies: boolean;
    /**
     * Indicates whether xpm init templates accept a single parameter.
     *
     * @remarks
     * Legacy behavior (before 0.22.0): init templates accepted only a single
     * parameter combining template name and optional arguments.
     *
     * Modern behavior (0.22.0+): init templates support multiple parameters
     * for more flexible template initialization and configuration.
     *
     * Set to `true` for packages with minimumXpmRequired \< 0.22.0.
     */
    singleParameterXpmInitTemplate: boolean;
    /**
     * Constructs policy flags based on a minimum xpm version.
     *
     * @remarks
     * The constructor evaluates each policy flag by comparing the provided
     * minimum version against threshold versions where behavior changed.
     *
     * Evaluation process:
     *
     * <ol>
     * <li>Validate that minVersion is a valid semver string.</li>
     * <li>If invalid, retain default values (all flags false = modern
     * behavior).</li>
     * <li>For each policy, use semver.lt() to check if minVersion is less than
     *    the threshold version.</li>
     * <li>If minVersion \< threshold, enable legacy behavior (flag = true).</li>
     * <li>If minVersion \>= threshold, use modern behavior (flag = false).</li>
     * </ol>
     *
     * This ensures that packages explicitly declaring their minimum version
     * get the behavior that was current at that version, while packages
     * without a valid minimum version default to the most modern behavior.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param minVersion - The minimum xpm version to evaluate.
     */
    constructor({ log, minVersion }: {
        log: Logger;
        minVersion: string;
    });
}
//# sourceMappingURL=policies.d.ts.map