import { Logger } from '@xpack/logger';
/**
 * Recursively changes file permissions within a folder tree.
 *
 * @remarks
 * This function modifies file system permissions recursively, handling both
 * files and directories with special logic to avoid permission conflicts.
 *
 * Processing strategy:
 *
 * 1. Symbolic links: Ignored because lchmod was deprecated and permissions
 *    cannot be reliably changed across platforms.
 *
 * 2. Read-only mode: Process folder contents first (recursively), then set
 *    the folder itself to read-only. This prevents permission denied errors
 *    when trying to access a read-only folder's contents.
 *
 * 3. Read-write mode: Set folder to read-write first, then process contents
 *    recursively. This ensures the folder is writable before attempting to
 *    modify nested items.
 *
 * Permission modes applied:
 *
 * - Read-only: Removes all write bits (user, group, other) using bitwise
 *   AND with negated S_IWUSR | S_IWGRP | S_IWOTH.
 *
 * - Read-write: Adds only user write bit using bitwise OR with S_IWUSR,
 *   preserving existing group and other permissions.
 *
 * The function validates the result after each chmod operation and logs
 * warnings if the expected permission state is not achieved, which can
 * occur on filesystems with non-standard permission handling.
 *
 * @param inputPath - The file or folder path to process.
 * @param readOnly - Whether to set permissions to read-only.
 * @param log - The logger instance for output and diagnostics.
 * @returns A promise that resolves when all permissions have been updated.
 *
 * @public
 */
export declare function chmodRecursive({ inputPath, readOnly, log, }: {
    inputPath: string;
    readOnly: boolean;
    log: Logger;
}): Promise<void>;
//# sourceMappingURL=chmod-recursive.d.ts.map