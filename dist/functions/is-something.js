export function isPrimitive(value) {
    return ((typeof value !== 'object' && typeof value !== 'function') || value === null);
}
export function isString(value) {
    return typeof value === 'string';
}
export function isObject(value) {
    return typeof value === 'object' && !Array.isArray(value);
}
export function isBoolean(value) {
    return typeof value === 'boolean';
}
export function isJsonObject(value) {
    return value !== undefined && !isPrimitive(value) && !Array.isArray(value);
}
export function isJsonArray(value) {
    return value !== undefined && Array.isArray(value);
}
export function isNonEmptyJsonObject(value) {
    return isJsonObject(value) && Object.keys(value).length > 0;
}
//# sourceMappingURL=is-something.js.map