import * as os from 'node:os';
import * as path from 'node:path';
export const liquidSubstitutionsVariablesBase = {
    env: process.env,
    os: {
        EOL: os.EOL,
        arch: os.arch(),
        constants: {
            signals: os.constants.signals,
            errno: os.constants.errno,
        },
        cpus: os.cpus(),
        endianness: os.endianness(),
        homedir: os.homedir(),
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        tmpdir: os.tmpdir(),
        type: os.type(),
        version: os.version(),
    },
    path: {
        delimiter: path.delimiter,
        sep: path.sep,
        win32: {
            delimiter: path.win32.delimiter,
            sep: path.win32.sep,
        },
        posix: {
            delimiter: path.posix.delimiter,
            sep: path.posix.sep,
        },
    },
    properties: {},
};
//# sourceMappingURL=substitutions-variables.js.map