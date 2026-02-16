export class PlatformDetector {
    process;
    constructor(_process = globalThis.process) {
        this.process = _process;
    }
    getPlatformInfo(options = {}) {
        const { doForce32bit = false } = options;
        let arch = this.process.arch;
        if (doForce32bit) {
            if (arch === 'x64') {
                arch = 'ia32';
            }
            else if (arch === 'arm64') {
                arch = 'arm';
            }
        }
        return {
            platform: this.process.platform,
            arch,
        };
    }
    isWindows() {
        return this.process.platform === 'win32';
    }
}
//# sourceMappingURL=platform-detection.js.map