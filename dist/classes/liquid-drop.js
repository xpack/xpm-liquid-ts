import * as liquidjs from 'liquidjs';
import { isJsonObject } from '../functions/is-something.js';
import { InputError } from './errors.js';
export class LiquidPropertiesDrop extends liquidjs.Drop {
    _log;
    _properties;
    _engine;
    constructor({ engine, properties, log, }) {
        super();
        log.trace(`${LiquidPropertiesDrop.name}()`);
        this._log = log;
        this._engine = engine;
        this._properties = properties;
    }
    async liquidMethodMissing(key, context) {
        if (this._properties[key] === undefined) {
            throw new InputError(`"properties.${key}" not defined`);
        }
        const log = this._log;
        const value = this._properties[key];
        log.trace(`${LiquidPropertiesDrop.name}.liquidMethodMissing('${key}') in (`, value, ')');
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
        log.trace(`${LiquidPropertiesDrop.name}.liquidMethodMissing('${key}')` + ` => (`, result, ')');
        return result;
    }
}
export class LiquidMatrixDrop extends liquidjs.Drop {
    _log;
    _matrix;
    _engine;
    constructor({ engine, matrix, log }) {
        super();
        log.trace(`${LiquidMatrixDrop.name}()`);
        this._log = log;
        this._engine = engine;
        this._matrix = matrix;
    }
    async liquidMethodMissing(key, context) {
        if (this._matrix[key] === undefined) {
            throw new InputError(`"matrix.${key}" not defined`);
        }
        const log = this._log;
        const value = this._matrix[key];
        log.trace(`${LiquidMatrixDrop.name}.liquidMethodMissing('${key}') in (`, value, ')');
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
        log.trace(`${LiquidMatrixDrop.name}.liquidMethodMissing('${key}')` + ` => (`, result, ')');
        return result;
    }
}
//# sourceMappingURL=liquid-drop.js.map