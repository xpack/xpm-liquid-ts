export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function getPlatformKey({ doForce32bit = false, } = {}) {
    const platform = process.platform;
    let arch = process.arch;
    if (doForce32bit) {
        if (arch === 'x64') {
            arch = 'ia32';
        }
        else if (arch === 'arm64') {
            arch = 'arm';
        }
    }
    const key = `${platform}-${arch}`;
    return key;
}
//# sourceMappingURL=utils.js.map