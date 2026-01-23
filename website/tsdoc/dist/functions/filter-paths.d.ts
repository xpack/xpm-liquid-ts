/**
 * Replaces non-alphanumeric characters with dashes to make paths
 * comply with file system names.
 *
 * @remarks
 * This function sanitizes strings to be safely used as file or folder names
 * by removing or replacing problematic characters that could cause issues
 * across different file systems.
 *
 * Platform-specific processing:
 *
 * - Windows: Preserves backslashes (\\) and colons (:) for drive letters
 *   and path separators (e.g., C:\\path\\to\\file). Replaces all other
 *   non-alphanumeric characters with dashes.
 *
 * - POSIX (Linux, macOS): Preserves forward slashes (/) for path
 *   separators. Replaces all other non-alphanumeric characters with dashes.
 *
 * Post-processing: After character replacement, consecutive dashes are
 * collapsed to a single dash to avoid excessive dashes from adjacent
 * special characters (e.g., "foo--bar" becomes "foo-bar").
 *
 * Common use cases include sanitizing build configuration names,
 * user-provided identifiers, and template-generated path components.
 *
 * @param input - A path candidate.
 * @returns A validated path.
 *
 * @public
 */
export declare function filterPath(input: string): string;
/**
 * Replaces non-alphanumeric characters with dashes to make paths
 * comply with POSIX file system names.
 *
 * @remarks
 * This function provides explicit POSIX path sanitization regardless of the
 * current platform. Useful when generating paths that will be used on
 * Linux or macOS systems, or when consistency across platforms is required.
 *
 * Processing rules:
 *
 * - Preserves forward slashes (/) for path separators.
 *
 * - Replaces all non-alphanumeric characters (except /) with dashes.
 *
 * - Collapses consecutive dashes to single dashes.
 *
 * Use this function instead of {@link filterPath} when you need guaranteed
 * POSIX-style sanitization even when running on Windows, such as when
 * generating paths for remote Linux systems or container images.
 *
 * @param input - A path candidate.
 * @returns A validated path.
 *
 * @public
 */
export declare function filterPosixPath(input: string): string;
/**
 * Replaces non-alphanumeric characters with dashes to make paths
 * comply with Windows file system names.
 *
 * @remarks
 * This function provides explicit Windows path sanitization regardless of
 * the current platform. Useful when generating paths that will be used on
 * Windows systems, or when consistency across platforms is required.
 *
 * Processing rules:
 *
 * - Preserves backslashes (\) for path separators.
 *
 * - Preserves colons (:) for drive letter designation (e.g., C:).
 *
 * - Replaces all other non-alphanumeric characters with dashes.
 *
 * - Collapses consecutive dashes to single dashes.
 *
 * Use this function instead of {@link filterPath} when you need guaranteed
 * Windows-style sanitization even when running on POSIX systems, such as
 * when generating paths for remote Windows systems or WSL environments.
 *
 * @param input - A path candidate.
 * @returns A validated path.
 *
 * @public
 */
export declare function filterWin32Path(input: string): string;
//# sourceMappingURL=filter-paths.d.ts.map