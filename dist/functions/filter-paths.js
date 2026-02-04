export function filterPath(input) {
    const fixed = process.platform === 'win32'
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