import * as os from 'node:os';
import * as path from 'node:path';
import * as util from 'node:util';
import * as liquidjs from 'liquidjs';
import { isJsonObject } from '../functions/is-something.js';
import { PlatformDetector } from './platform-detector.js';
export class LiquidEngine extends liquidjs.Liquid {
    platformDetector;
    constructor({ platformDetector = new PlatformDetector(), options = {}, } = {}) {
        super({
            strictFilters: true,
            strictVariables: true,
            trimTagLeft: false,
            trimTagRight: false,
            trimOutputLeft: false,
            trimOutputRight: false,
            greedy: false,
            lenientIf: true,
            cache: false,
            ...options,
        });
        this.platformDetector = platformDetector;
        this.registerFilter('path_basename', (p, ...arg) => path.basename(p, ...arg));
        this.registerFilter('path_dirname', (p) => path.dirname(p));
        this.registerFilter('path_normalize', (p) => path.normalize(p));
        this.registerFilter('path_join', (p, ...args) => path.join(p, ...args));
        this.registerFilter('path_relative', (from, to) => path.relative(from, to));
        this.registerFilter('path_posix_basename', (p, ...arg) => path.posix.basename(p, ...arg));
        this.registerFilter('path_posix_dirname', (p) => path.posix.dirname(p));
        this.registerFilter('path_posix_normalize', (p) => path.posix.normalize(p));
        this.registerFilter('path_posix_join', (p, ...args) => path.posix.join(p, ...args));
        this.registerFilter('path_posix_relative', (from, to) => path.posix.relative(from, to));
        this.registerFilter('path_win32_basename', (p, ...arg) => path.win32.basename(p, ...arg));
        this.registerFilter('path_win32_dirname', (p) => path.win32.dirname(p));
        this.registerFilter('path_win32_normalize', (p) => path.win32.normalize(p));
        this.registerFilter('path_win32_join', (p, ...args) => path.win32.join(p, ...args));
        this.registerFilter('path_win32_relative', (from, to) => path.win32.relative(from, to));
        this.registerFilter('util_format', (format, ...args) => {
            return util.format(format, ...args);
        });
        this.registerFilter('to_filename', (input) => {
            const fixed = this.platformDetector.isWindows()
                ? input.replace(/[^a-zA-Z0-9\\:]+/g, '-')
                : input.replace(/[^a-zA-Z0-9/]+/g, '-');
            return fixed.replace(/--/g, '-');
        });
        this.registerFilter('join_lines', (input) => {
            if (Array.isArray(input)) {
                return input.join(os.EOL);
            }
            return String(input);
        });
        this.registerFilter('split_lines', (input) => {
            if (Array.isArray(input)) {
                return input.join(os.EOL).split(os.EOL);
            }
            return input.split(os.EOL);
        });
        this.registerFilter('keys', (input) => {
            if (isJsonObject(input)) {
                const keys = Object.keys(input);
                return keys;
            }
            else if (Array.isArray(input)) {
                const keys = Object.keys(input);
                return keys;
            }
            else {
                return String(input);
            }
        });
    }
}
//# sourceMappingURL=liquid-engine.js.map