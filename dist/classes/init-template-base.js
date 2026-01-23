import assert from 'node:assert';
import * as util from 'node:util';
import * as readline from 'node:readline/promises';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { makeDirectory } from 'make-dir';
import { copyFile } from 'cp-file';
import { Liquid } from 'liquidjs';
import { XpmOutputError, XpmSyntaxError } from './errors.js';
export class XpmInitTemplateBase {
    context;
    log;
    propertiesDefinitions = {};
    __dirname;
    templatesPath;
    engine;
    substitutionsVariables;
    constructor({ context, __dirname, templatesPath, propertiesDefinitions, }) {
        assert(context);
        assert(context.log);
        assert(__dirname);
        assert(templatesPath);
        assert(propertiesDefinitions);
        this.context = context;
        this.log = context.log;
        this.propertiesDefinitions = propertiesDefinitions;
        this.__dirname = __dirname;
        this.templatesPath = templatesPath;
        this.engine = new Liquid({
            root: this.templatesPath,
            cache: false,
            strictFilters: true,
            strictVariables: true,
            trimTagRight: false,
            trimTagLeft: false,
            greedy: false,
        });
    }
    async run() {
        const log = this.log;
        log.trace(`${this.constructor.name}.run()`);
        log.info();
        const context = this.context;
        const config = context.config;
        assert(config.properties);
        let isError = false;
        for (const [key, val] of Object.entries(config.properties)) {
            try {
                config.properties[key] = this.validateValue(key, val);
            }
            catch (err) {
                if (err instanceof Error) {
                    log.error(err.message);
                }
                isError = true;
            }
        }
        if (isError) {
            throw new XpmSyntaxError();
        }
        const mustAsk = Object.keys(this.propertiesDefinitions).some((key) => {
            return (this.propertiesDefinitions[key].isMandatory && !config.properties?.[key]);
        });
        let isInteractive;
        if (mustAsk) {
            if (!(process.stdin.isTTY && process.stdout.isTTY)) {
                throw new XpmSyntaxError('Interactive mode not possible without a TTY.');
            }
            await this.askForMoreValues();
            log.trace(util.inspect(config.properties));
            context.startTime = Date.now();
            isInteractive = true;
        }
        else {
            Object.entries(this.propertiesDefinitions).forEach(([key, val]) => {
                assert(config.properties);
                if (!config.properties[key] && val.default) {
                    config.properties[key] = val.default;
                }
            });
            isInteractive = false;
        }
        const currentTime = new Date();
        const substitutionsVariables = {
            ...config.properties,
            properties: config.properties,
            propertiesNames: Object.keys(config.properties),
            projectName: config.projectName,
            year: currentTime.getFullYear().toString(),
        };
        this.substitutionsVariables = substitutionsVariables;
        await this.generate(isInteractive);
        return 0;
    }
    validateValue(name, value) {
        const propDef = this.propertiesDefinitions[name];
        if (propDef === undefined) {
            throw new Error(`Unsupported property '${name}'`);
        }
        if (propDef.type === 'select') {
            if (propDef.items[value]) {
                if (typeof propDef.items[value] === 'string') {
                    return value;
                }
                else if (typeof propDef.items[value] === 'object' &&
                    this.isPlatformSupported(propDef.items[value].platforms)) {
                    return value;
                }
            }
        }
        else if (propDef.type === 'boolean') {
            if (value === 'true') {
                return true;
            }
            else if (value === 'false') {
                return false;
            }
        }
        else if (propDef.type === 'number') {
            return Number(value);
        }
        if (value === '' && propDef.default !== undefined) {
            return propDef.default;
        }
        throw new Error(`Unsupported value '${value}' for property '${name}'`);
    }
    async askForMoreValues() {
        const context = this.context;
        const config = context.config;
        assert(config.properties);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        for (const name of Object.keys(this.propertiesDefinitions)) {
            if (config.properties[name]) {
                continue;
            }
            const definition = this.propertiesDefinitions[name];
            let prompt = `${definition.label}?`;
            if (definition.type === 'select') {
                prompt += ' (';
                const validItems = [];
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
                    const value = this.validateValue(name, answer);
                    config.properties[name] = value;
                    break;
                }
                catch (err) {
                    if (err instanceof Error) {
                        this.log.trace(err.message);
                    }
                    console.log(definition.description);
                    if (definition.type === 'select') {
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
        if (!platforms || platforms.length === 0) {
            return false;
        }
        if (platforms.includes(`${process.platform}-${process.arch}`)) {
            return true;
        }
        if (platforms.includes(process.platform)) {
            return true;
        }
        return false;
    }
    async copyFile(sourceFileRelativePath, destinationFilePath = sourceFileRelativePath) {
        const log = this.log;
        await makeDirectory(path.dirname(destinationFilePath));
        const sourceFileAbsolutePath = path.resolve(this.templatesPath, sourceFileRelativePath);
        await copyFile(sourceFileAbsolutePath, destinationFilePath);
        log.info(`File '${destinationFilePath}' copied.`);
    }
    async copyFolder(source, destination = source) {
        const log = this.log;
        await this._copyFolderRecursively(path.resolve(this.templatesPath, source), path.resolve(destination));
        log.info(`Folder '${destination}' copied.`);
    }
    async _copyFolderRecursively(sourceFolderPath, destinationFolderPath) {
        await makeDirectory(path.dirname(destinationFolderPath));
        const dirents = await fs.readdir(sourceFolderPath, {
            withFileTypes: true,
        });
        for (const dirent of dirents) {
            if (dirent.isDirectory()) {
                await this._copyFolderRecursively(path.join(sourceFolderPath, dirent.name), path.join(destinationFolderPath, dirent.name));
            }
            else {
                await copyFile(path.join(sourceFolderPath, dirent.name), path.join(destinationFolderPath, dirent.name));
            }
        }
    }
    async render(inputFileRelativePath, outputFileRelativePath, substitutionsVariables = this.substitutionsVariables) {
        const log = this.log;
        log.trace(`render(${inputFileRelativePath}, ${outputFileRelativePath})`);
        await makeDirectory(path.dirname(outputFileRelativePath));
        try {
            const fileContent = (await this.engine.renderFile(inputFileRelativePath, substitutionsVariables));
            await fs.writeFile(outputFileRelativePath, fileContent, 'utf8');
        }
        catch (err) {
            if (err instanceof Error) {
                throw new XpmOutputError(err.message);
            }
        }
        log.info(`File '${outputFileRelativePath}' generated.`);
    }
}
//# sourceMappingURL=init-template-base.js.map