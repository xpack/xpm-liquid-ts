import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ConfigurationError } from '../index.js';
const CHMOD_RECURSIVELY_MAX_DEPTH = 42;
export async function chmodRecursively({ inputPath, readOnly, log, depth = 0, maxDepth = CHMOD_RECURSIVELY_MAX_DEPTH, }) {
    assert(inputPath, 'inputPath is required');
    assert(log, 'log is required');
    assert(maxDepth > 0, 'maxDepth must be a positive integer');
    if (depth > maxDepth) {
        throw new ConfigurationError(`Recursion depth limit exceeded ` +
            `(${String(maxDepth)} levels) ` +
            `whilst processing: ${inputPath}`);
    }
    const stat = await fs.lstat(inputPath);
    if (stat.isSymbolicLink()) {
        log.trace(inputPath, 'is a symbolic link, skipping');
        return;
    }
    if (readOnly && stat.isDirectory()) {
        log.trace(inputPath);
        const dirents = await fs.readdir(inputPath, {
            withFileTypes: true,
        });
        for (const dirent of dirents) {
            await chmodRecursively({
                inputPath: path.resolve(inputPath, dirent.name),
                readOnly,
                log,
                depth: depth + 1,
            });
        }
    }
    const mode = stat.mode;
    const newMode = readOnly
        ? mode &
            ~(fs.constants.S_IWUSR | fs.constants.S_IWGRP | fs.constants.S_IWOTH)
        : mode | fs.constants.S_IWUSR;
    await fs.chmod(inputPath, newMode);
    const actualStat = await fs.stat(inputPath);
    if (readOnly) {
        if ((actualStat.mode & fs.constants.S_IWUSR) !== 0) {
            log.warn(`${inputPath} not set to RO`);
        }
    }
    else {
        if ((actualStat.mode & fs.constants.S_IWUSR) === 0) {
            log.warn(`${inputPath} not set to RW`);
        }
    }
    if (!readOnly && stat.isDirectory()) {
        log.trace(inputPath);
        const dirents = await fs.readdir(inputPath, {
            withFileTypes: true,
        });
        for (const dirent of dirents) {
            await chmodRecursively({
                inputPath: path.resolve(inputPath, dirent.name),
                readOnly,
                log,
                depth: depth + 1,
            });
        }
    }
}
//# sourceMappingURL=chmod-recursively.js.map