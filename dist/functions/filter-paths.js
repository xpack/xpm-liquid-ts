import { PlatformDetector } from '../classes/platform-detector.js';
export function filterPath(input, platformDetector = new PlatformDetector()) {
    const fixed = platformDetector.isWindows()
        ? input.replace(/[^a-zA-Z0-9\\:]+/g, '-')
        : input.replace(/[^a-zA-Z0-9/]+/g, '-');
    return fixed.replace(/--/g, '-');
}
export function filterPosixPath(input) {
    const fixed = input.replace(/[^a-zA-Z0-9/]+/g, '-');
    return fixed.replace(/--/g, '-');
}
export function filterWin32Path(input) {
    const fixed = input.replace(/[^a-zA-Z0-9\\:]+/g, '-');
    return fixed.replace(/--/g, '-');
}
//# sourceMappingURL=filter-paths.js.map