import { Drop } from 'liquidjs';
import { isJsonObject } from '../functions/is-something.js';
import { XpmInputError } from '../classes/errors.js';
export class XpmLiquidPropertiesDrop extends Drop {
    _log;
    _properties;
    _engine;
    constructor({ log, engine, properties, }) {
        super();
        log.trace(`${XpmLiquidPropertiesDrop.name}()`);
        this._log = log;
        this._engine = engine;
        this._properties = properties;
    }
    async liquidMethodMissing(key, context) {
        if (this._properties[key] === undefined) {
            throw new XpmInputError(`"properties.${key}" not defined`);
        }
        const log = this._log;
        const value = this._properties[key];
        log.trace(`${XpmLiquidPropertiesDrop.name}.liquidMethodMissing('${key}') in (`, value, ')');
        let result;
        if (isJsonObject(value)) {
            return value;
        }
        const valueString = Array.isArray(value) ? value.join('') : value;
        if (valueString.includes('{{') || valueString.includes('{%')) {
            result = (await this._engine.parseAndRender(valueString, context));
        }
        else {
            result = value;
        }
        log.trace(`${XpmLiquidPropertiesDrop.name}.liquidMethodMissing('${key}')` + ` => (`, result, ')');
        return result;
    }
}
export class XpmLiquidMatrixDrop extends Drop {
    _log;
    _matrix;
    _engine;
    constructor({ log, engine, matrix, }) {
        super();
        log.trace(`${XpmLiquidMatrixDrop.name}()`);
        this._log = log;
        this._engine = engine;
        this._matrix = matrix;
    }
    async liquidMethodMissing(key, context) {
        if (this._matrix[key] === undefined) {
            throw new XpmInputError(`"matrix.${key}" not defined`);
        }
        const log = this._log;
        const value = this._matrix[key];
        log.trace(`${XpmLiquidMatrixDrop.name}.liquidMethodMissing('${key}') in (`, value, ')');
        let result;
        if (isJsonObject(value)) {
            return value;
        }
        const valueString = Array.isArray(value) ? value.join('') : value;
        if (valueString.includes('{{') || valueString.includes('{%')) {
            result = (await this._engine.parseAndRender(valueString, context));
        }
        else {
            result = value;
        }
        log.trace(`${XpmLiquidMatrixDrop.name}.liquidMethodMissing('${key}')` + ` => (`, result, ')');
        return result;
    }
}
//# sourceMappingURL=liquid-drop.js.map