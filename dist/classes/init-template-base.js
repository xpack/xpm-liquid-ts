import assert from 'node:assert';
import * as util from 'node:util';
import * as readline from 'node:readline/promises';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Liquid } from 'liquidjs';
import { XpmError, XpmOutputError, XpmSyntaxError } from './errors.js';
import { isBoolean, isNumber, isObject, isString, } from '../functions/is-something.js';
export class XpmInitTemplateBase {
    _context;
    _log;
    _propertiesDefinitions = {};
    __dirname;
    _templatesPath;
    _engine;
    _substitutionsVariables;
    _isInteractive = false;
    _process;
    constructor({ context, __dirname, templatesPath, propertiesDefinitions, process: _process = process, }) {
        assert(context, 'context is required');
        assert(context.log, 'context.log is required');
        assert(context.config, 'context.context is required');
        assert(context.config.projectName, 'context.config.projectName is required');
        assert(context.config.properties, 'context.config.properties is required');
        assert(__dirname, '__dirname is required');
        assert(templatesPath, 'templatesPath is required');
        assert(propertiesDefinitions, 'propertiesDefinitions is required');
        this._context = context;
        this._log = context.log;
        this._propertiesDefinitions = propertiesDefinitions;
        this.__dirname = __dirname;
        this._templatesPath = templatesPath;
        this._process = _process;
        this._validatePropertiesDefinitions();
        this._engine = new Liquid({
            root: this._templatesPath,
            cache: false,
            strictFilters: true,
            strictVariables: true,
            trimTagRight: false,
            trimTagLeft: false,
            greedy: false,
        });
    }
    async run() {
        const log = this._log;
        log.trace(`${this.constructor.name}.run()`);
        log.info();
        const context = this._context;
        const config = context.config;
        assert(config.properties, 'config.properties is required');
        let isError = false;
        for (const [key, val] of Object.entries(config.properties)) {
            try {
                config.properties[key] = this._validatePropertyValue(key, val);
            }
            catch (error) {
                if (error instanceof Error) {
                    log.error(error.message);
                }
                isError = true;
            }
        }
        if (isError) {
            throw new XpmSyntaxError();
        }
        const mustAsk = Object.keys(this._propertiesDefinitions).some((key) => {
            return (this._propertiesDefinitions[key].isMandatory &&
                !config.properties?.[key]);
        });
        let isInteractive;
        if (mustAsk) {
            if (!(this._process.stdin.isTTY && this._process.stdout.isTTY)) {
                throw new XpmSyntaxError('Interactive mode not possible without a TTY.');
            }
            await this.askForMoreValues();
            log.trace(util.inspect(config.properties));
            context.startTime = Date.now();
            isInteractive = true;
        }
        else {
            Object.entries(this._propertiesDefinitions).forEach(([key, val]) => {
                assert(config.properties, 'config.properties is required');
                if (!config.properties[key] && val.default !== undefined) {
                    config.properties[key] = val.default;
                }
            });
            isInteractive = false;
        }
        this._isInteractive = isInteractive;
        const currentTime = new Date();
        const substitutionsVariables = {
            ...config.properties,
            properties: config.properties,
            propertiesNames: Object.keys(config.properties),
            projectName: config.projectName,
            year: currentTime.getFullYear().toString(),
        };
        this._substitutionsVariables = substitutionsVariables;
        await this.generate();
        return 0;
    }
    _validatePropertyValue(name, value) {
        const propDef = this._propertiesDefinitions[name];
        if (propDef === undefined) {
            throw new XpmError(`Unsupported property '${name}'`);
        }
        const trimmedValue = value.trim();
        switch (propDef.type) {
            case 'select':
                assert(propDef.items, `Property '${name}' of type 'select' has no items.`);
                if (propDef.items[value]) {
                    if (typeof propDef.items[value] === 'string') {
                        return value;
                    }
                    else if (typeof propDef.items[value] === 'object' &&
                        this.isPlatformSupported(propDef.items[value].platforms)) {
                        return value;
                    }
                }
                break;
            case 'boolean':
                if (trimmedValue === 'true') {
                    return true;
                }
                else if (trimmedValue === 'false') {
                    return false;
                }
                break;
            case 'number': {
                const num = Number(trimmedValue);
                if (trimmedValue !== '' && isFinite(num)) {
                    return num;
                }
                break;
            }
            case 'string':
                if (trimmedValue !== '') {
                    return value;
                }
                if (propDef.default !== undefined) {
                    return propDef.default;
                }
                break;
        }
        throw new XpmError(`Unsupported value '${value}' for property '${name}'`);
    }
    async askForMoreValues() {
        const context = this._context;
        const config = context.config;
        assert(config.properties, 'config.properties is required');
        const rl = readline.createInterface({
            input: this._process.stdin,
            output: this._process.stdout,
        });
        for (const name of Object.keys(this._propertiesDefinitions)) {
            if (config.properties[name]) {
                continue;
            }
            const definition = this._propertiesDefinitions[name];
            let prompt = `${definition.label}?`;
            if (definition.type === 'select') {
                prompt += ' (';
                const validItems = [];
                assert(definition.items, 'definition.items is required');
                for (const [ikey, ival] of Object.entries(definition.items)) {
                    if (typeof ival === 'string') {
                        validItems.push(ikey);
                    }
                    else if (typeof ival === 'object' &&
                        this.isPlatformSupported(ival.platforms)) {
                        validItems.push(ikey);
                    }
                }
                prompt += validItems.join(', ');
                prompt += ', ?)';
            }
            else if (definition.type === 'boolean') {
                prompt += ' (true, false, ?)';
            }
            if (definition.default !== undefined) {
                prompt += ` [${String(definition.default)}]`;
            }
            prompt += ': ';
            while (true) {
                const answer = (await rl.question(prompt)).trim();
                try {
                    const value = this._validatePropertyValue(name, answer);
                    config.properties[name] = value;
                    break;
                }
                catch (error) {
                    if (error instanceof Error) {
                        this._log.trace(error.message);
                    }
                    console.log(definition.description);
                    if (definition.type === 'select') {
                        assert(definition.items, 'definition.items is required');
                        for (const [ikey, ival] of Object.entries(definition.items)) {
                            if (typeof ival === 'string') {
                                console.log(`- ${ikey}: ${ival}`);
                            }
                            else if (typeof ival === 'object' &&
                                this.isPlatformSupported(ival.platforms)) {
                                console.log(`- ${ikey}: ${ival.message}`);
                            }
                        }
                    }
                }
            }
        }
    }
    isPlatformSupported(platforms) {
        assert(platforms && platforms.length !== 0, 'platforms array is required');
        if (platforms.includes(`${this._process.platform}-${this._process.arch}`)) {
            return true;
        }
        if (platforms.includes(this._process.platform)) {
            return true;
        }
        return false;
    }
    async copyFile({ sourceFileRelativePath, destinationFilePath = sourceFileRelativePath, }) {
        const log = this._log;
        await fs.mkdir(path.dirname(destinationFilePath), { recursive: true });
        const sourceFileAbsolutePath = path.resolve(this._templatesPath, sourceFileRelativePath);
        await fs.copyFile(sourceFileAbsolutePath, destinationFilePath);
        const destinationFileRelativePath = path.relative(this._context.config.cwd, destinationFilePath);
        log.info(`File '${destinationFileRelativePath}' copied.`);
    }
    async copyFolder({ sourceFolderRelativePath, destinationFolderPath = sourceFolderRelativePath, }) {
        const log = this._log;
        const sourceFolderAbsolutePath = path.resolve(this._templatesPath, sourceFolderRelativePath);
        await this._copyFolderRecursively({
            sourceFolderPath: sourceFolderAbsolutePath,
            destinationFolderPath: path.resolve(destinationFolderPath),
        });
        log.info(`Folder '${destinationFolderPath}' copied.`);
    }
    async _copyFolderRecursively({ sourceFolderPath, destinationFolderPath, }) {
        await fs.mkdir(destinationFolderPath, { recursive: true });
        const dirents = await fs.readdir(sourceFolderPath, {
            withFileTypes: true,
        });
        for (const dirent of dirents) {
            if (dirent.isDirectory()) {
                await this._copyFolderRecursively({
                    sourceFolderPath: path.join(sourceFolderPath, dirent.name),
                    destinationFolderPath: path.join(destinationFolderPath, dirent.name),
                });
            }
            else {
                await fs.copyFile(path.join(sourceFolderPath, dirent.name), path.join(destinationFolderPath, dirent.name));
            }
        }
    }
    async render({ sourceFilePath, destinationFilePath, substitutionsVariables = this._substitutionsVariables, }) {
        const log = this._log;
        const context = this._context;
        const config = context.config;
        const cwd = config.cwd;
        const sourceFileRelativePath = path.relative(cwd, sourceFilePath);
        const destinationFileRelativePath = path.relative(cwd, destinationFilePath);
        log.info(`Rendering template '${sourceFileRelativePath}' to ` +
            `'${destinationFileRelativePath}'`);
        log.trace(`render(${sourceFilePath}, ${destinationFilePath})`);
        try {
            const fileContent = (await this._engine.renderFile(sourceFilePath, substitutionsVariables));
            await fs.mkdir(path.dirname(destinationFilePath), { recursive: true });
            await fs.writeFile(destinationFilePath, fileContent, 'utf8');
        }
        catch (error) {
            if (error instanceof Error) {
                throw new XpmOutputError(error.message);
            }
        }
        log.info(`File '${destinationFileRelativePath}' generated.`);
    }
    _validatePropertiesDefinitions() {
        assert(isObject(this._propertiesDefinitions), 'propertiesDefinitions is not an object.');
        assert(Object.keys(this._propertiesDefinitions).length > 0, 'propertiesDefinitions is an empty object.');
        for (const [key, val] of Object.entries(this._propertiesDefinitions)) {
            assert(isString(val.label), `Property '${key}' must have a string label`);
            assert(val.label.trim() !== '', `Property '${key}' has an empty label`);
            assert(isString(val.description), `Property '${key}' must have a string description`);
            assert(val.description.trim() !== '', `Property '${key}' has an empty description`);
            if (val.isMandatory !== undefined) {
                assert(isBoolean(val.isMandatory), `Property '${key}' has a non boolean isMandatory value.`);
            }
            assert(val.type !== undefined, `Property '${key}' has no type defined.`);
            switch (val.type) {
                case 'select':
                    assert(val.items !== undefined, `Property '${key}' of type 'select' has no items.`);
                    assert(isObject(val.items), `Property '${key}' of type 'select' has invalid items.`);
                    assert(Object.keys(val.items).length !== 0, `Property '${key}' of type 'select' has no items.`);
                    for (const [ikey, ival] of Object.entries(val.items)) {
                        assert(isString(ival) ||
                            (isObject(ival) &&
                                Array.isArray(ival.platforms) &&
                                isString(ival.message)), `Property '${key}' has invalid item '${ikey}'.`);
                    }
                    if (!val.isMandatory) {
                        assert(val.default !== undefined, `Property '${key}' of type 'select' ` +
                            `must have a default value if not mandatory.`);
                    }
                    if (val.default !== undefined) {
                        assert(isString(val.default), `Property '${key}' has a non string default value.`);
                        assert(val.default.trim() !== '', `Property '${key}' has an empty default value.`);
                    }
                    if (val.default !== undefined) {
                        assert(Object.keys(val.items).includes(String(val.default)), `Property '${key}' has a default value not in items list.`);
                    }
                    break;
                case 'string':
                    if (val.default !== undefined) {
                        assert(isString(val.default), `Property '${key}' has a non string default value.`);
                        assert(val.default.trim() !== '', `Property '${key}' has an empty default value.`);
                    }
                    break;
                case 'number':
                    if (val.default !== undefined) {
                        assert(isNumber(val.default), `Property '${key}' has a non number default value.`);
                    }
                    break;
                case 'boolean':
                    if (val.default !== undefined) {
                        assert(isBoolean(val.default), `Property '${key}' has a non boolean default value.`);
                    }
                    break;
                default:
                    assert(false, `Property '${key}' has unsupported type '${String(val.type)}'.`);
                    break;
            }
        }
    }
}
//# sourceMappingURL=init-template-base.js.map