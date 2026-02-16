import { PlatformDetector } from '../classes/platform-detector.js';
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function getPlatformKey({ doForce32bit = false, platformDetector = new PlatformDetector(), } = {}) {
    const { platform, arch } = platformDetector.getPlatformInfo({ doForce32bit });
    const key = `${platform}-${arch}`;
    return key;
}
export function hasLiquidSyntax(value) {
    return /\{\{|\{%/.test(value);
}
//# sourceMappingURL=utils.js.map