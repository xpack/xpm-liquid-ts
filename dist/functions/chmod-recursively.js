import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
export async function chmodRecursively({ inputPath, readOnly, log, }) {
    assert(inputPath, 'mandatory inputPath');
    assert(log, 'mandatory log');
    const stat = await fs.lstat(inputPath);
    if (stat.isSymbolicLink()) {
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
            });
        }
    }
}
//# sourceMappingURL=chmod-recursively.js.map