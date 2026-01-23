import assert from 'node:assert';
import * as path from 'node:path';
import * as os from 'node:os';
import { buildFolderRelativePathPropertyName } from './liquid-package.js';
import { performSubstitutions } from '../functions/perform-substitutions.js';
import { XpmLiquidActions } from './liquid-actions.js';
import { getErrorMessage } from '../functions/utils.js';
import { isJsonArray, isJsonObject, isString, } from '../functions/is-something.js';
import { filterPath } from '../functions/filter-paths.js';
import { XpmError, XpmInputError } from './errors.js';
export class XpmLiquidBuildConfigurations {
    log;
    engine;
    substitutionsVariables;
    jsonBuildConfigurations;
    _buildConfigurationsMap = new Map();
    _jsonBuildConfigurationsNamesMap = new Map();
    _buildComfigurationsNamesSet = new Set();
    _isInitialised = false;
    constructor({ log, engine, substitutionsVariables, jsonBuildConfigurations, }) {
        assert(log);
        assert(engine);
        assert(substitutionsVariables);
        log.trace(`${XpmLiquidBuildConfigurations.name}()`);
        this.log = log;
        this.engine = engine;
        this.substitutionsVariables = substitutionsVariables;
        this.jsonBuildConfigurations = jsonBuildConfigurations ?? {};
    }
    async initialise() {
        const log = this.log;
        if (this._isInitialised) {
            log.trace(`${XpmLiquidBuildConfigurations.name}.initialise() again`);
            return false;
        }
        log.trace(`${XpmLiquidBuildConfigurations.name}.initialise()`);
        for (const buildConfigurationName of Object.keys(this.jsonBuildConfigurations)) {
            if (buildConfigurationName.includes('{{')) {
                try {
                    const jsonBuildConfigurationTemplate = this.jsonBuildConfigurations[buildConfigurationName];
                    const expandedBuildConfigurationsMap = await this._expandTemplateBuildConfigurations({
                        buildConfigurationName,
                        jsonBuildConfigurationTemplate,
                    });
                    for (const [expandedBuildConfigurationName, expandedBuildConfiguration,] of expandedBuildConfigurationsMap) {
                        if (this._buildComfigurationsNamesSet.has(expandedBuildConfigurationName)) {
                            throw new XpmError(`duplicate build configuration name ` +
                                `"${expandedBuildConfigurationName}" ` +
                                `generated from template.`);
                        }
                        else {
                            this._buildConfigurationsMap.set(expandedBuildConfigurationName, expandedBuildConfiguration);
                            this._jsonBuildConfigurationsNamesMap.set(expandedBuildConfigurationName, buildConfigurationName);
                        }
                    }
                }
                catch (error) {
                    const message = getErrorMessage(error) +
                        ` in buildConfiguration "${buildConfigurationName}"`;
                    throw new XpmError(message);
                }
            }
            else {
                if (this._buildComfigurationsNamesSet.has(buildConfigurationName)) {
                    throw new XpmError(`duplicate build configuration name ` +
                        `"${buildConfigurationName}" ` +
                        `possibly already generated from template.`);
                }
                else {
                    this._buildConfigurationsMap.set(buildConfigurationName, undefined);
                    this._jsonBuildConfigurationsNamesMap.set(buildConfigurationName, buildConfigurationName);
                }
            }
        }
        log.trace(`${XpmLiquidBuildConfigurations.name}.initialise() =>`, Array.from(this._buildConfigurationsMap.keys()));
        this._isInitialised = true;
        return true;
    }
    empty() {
        return this._buildConfigurationsMap.size === 0;
    }
    names() {
        const buildConfigurationsNames = Array.from(this._buildConfigurationsMap.keys());
        this.log.trace(`${XpmLiquidBuildConfigurations.name}.names() =>`, buildConfigurationsNames);
        return buildConfigurationsNames;
    }
    getJsonName(buildConfigurationName) {
        return this._jsonBuildConfigurationsNamesMap.get(buildConfigurationName);
    }
    hasJson(buildConfigurationName) {
        return this._jsonBuildConfigurationsNamesMap.has(buildConfigurationName);
    }
    getJson(buildConfigurationName) {
        return this.jsonBuildConfigurations[this.getJsonName(buildConfigurationName)];
    }
    isHidden(buildConfigurationName) {
        const jsonBuildConfigurationName = this.getJsonName(buildConfigurationName);
        if (jsonBuildConfigurationName.includes('{{')) {
            const jsonBuildConfigurationTemplate = this.jsonBuildConfigurations[jsonBuildConfigurationName];
            return jsonBuildConfigurationTemplate.template.hidden ?? false;
        }
        const jsonBuildConfigurationContent = this
            .jsonBuildConfigurations[jsonBuildConfigurationName];
        return jsonBuildConfigurationContent.hidden ?? false;
    }
    has(buildConfigurationName) {
        return this._buildConfigurationsMap.has(buildConfigurationName);
    }
    get(buildConfigurationName) {
        const log = this.log;
        log.trace(`${XpmLiquidBuildConfigurations.name}.get(${buildConfigurationName})`);
        let buildConfiguration = this._buildConfigurationsMap.get(buildConfigurationName);
        if (buildConfiguration === undefined) {
            const jsonBuildConfigurationName = this._jsonBuildConfigurationsNamesMap.get(buildConfigurationName);
            const jsonBuildConfiguration = (this
                .jsonBuildConfigurations[jsonBuildConfigurationName] ??
                {});
            buildConfiguration = new XpmLiquidBuildConfiguration({
                buildConfigurationName,
                jsonBuildConfiguration,
                parentBuildConfigurations: this,
            });
            this._buildConfigurationsMap.set(buildConfigurationName, buildConfiguration);
        }
        return buildConfiguration;
    }
    async _expandTemplateBuildConfigurations({ buildConfigurationName, jsonBuildConfigurationTemplate, }) {
        const log = this.log;
        log.trace(`${XpmLiquidBuildConfigurations.name}.` +
            `#expandTemplateBuildConfigurations(${buildConfigurationName})`);
        const newBuildConfigurationsMap = new Map();
        if (!isJsonObject(jsonBuildConfigurationTemplate.matrix)) {
            throw new XpmError(`buildConfiguration "${buildConfigurationName}" ` +
                `matrix is not an object`);
        }
        if (!isJsonObject(jsonBuildConfigurationTemplate.template)) {
            throw new XpmError(`buildConfiguration "${buildConfigurationName}" ` +
                `template is not a JSON object`);
        }
        const matrixKeys = [];
        const matrixValues = [];
        for (const [matrixKey, matrixValueArray] of Object.entries(jsonBuildConfigurationTemplate.matrix)) {
            if (!isJsonArray(matrixValueArray)) {
                throw new XpmError(`buildConfiguration "${buildConfigurationName}" ` +
                    `matrix.${matrixKey} is not an array`);
            }
            for (const matrixValue of matrixValueArray) {
                if (!isString(matrixValue)) {
                    throw new XpmError(`buildConfiguration "${buildConfigurationName}" ` +
                        `matrix.${matrixKey} value is not a string`);
                }
            }
            matrixKeys.push(matrixKey);
            const stringValue = matrixValueArray.join(os.EOL);
            if (stringValue.includes('{{') || stringValue.includes('{%')) {
                let substitutedValue;
                try {
                    substitutedValue = await performSubstitutions({
                        input: stringValue,
                        engine: this.engine,
                        substitutionsVariables: {
                            ...this.substitutionsVariables,
                        },
                        log: this.log,
                    });
                }
                catch (error) {
                    const message = getErrorMessage(error) +
                        ` in buildConfiguration "${buildConfigurationName}" ` +
                        `matrix substitution`;
                    throw new XpmError(message);
                }
                matrixValues.push(substitutedValue.replace(new RegExp(os.EOL + '$'), '').split(os.EOL));
            }
            else {
                matrixValues.push(matrixValueArray);
            }
        }
        const createSubstitutedBuildConfiguration = async (combination) => {
            let substitutedBuildConfigurationName;
            try {
                substitutedBuildConfigurationName = await performSubstitutions({
                    input: buildConfigurationName,
                    engine: this.engine,
                    substitutionsVariables: {
                        ...this.substitutionsVariables,
                        matrix: combination,
                    },
                    log: this.log,
                });
            }
            catch (error) {
                const message = getErrorMessage(error) +
                    ` in buildConfiguration "${buildConfigurationName}" ` +
                    `name substitution`;
                throw new XpmError(message);
            }
            const newBuildConfiguration = new XpmLiquidBuildConfiguration({
                buildConfigurationName: substitutedBuildConfigurationName,
                templateBuildConfigurationName: buildConfigurationName,
                jsonBuildConfiguration: jsonBuildConfigurationTemplate.template,
                parentBuildConfigurations: this,
                matrixParameters: { ...combination },
            });
            newBuildConfigurationsMap.set(substitutedBuildConfigurationName, newBuildConfiguration);
        };
        const generateCombinationsRecursively = async (index, combination) => {
            const log = this.log;
            log.trace(`${XpmLiquidBuildConfigurations.name}.` +
                `#expandTemplateBuildConfigurations().` +
                `generateCombinationsRecursively(${String(index)}, ${JSON.stringify(combination)})`);
            if (index === matrixKeys.length) {
                await createSubstitutedBuildConfiguration(combination);
                return;
            }
            const key = matrixKeys[index];
            const values = matrixValues[index];
            for (const value of values) {
                combination[key] = value;
                await generateCombinationsRecursively(index + 1, combination);
            }
        };
        await generateCombinationsRecursively(0, {});
        return newBuildConfigurationsMap;
    }
}
export class XpmLiquidBuildConfiguration {
    buildConfigurationName;
    templateBuildConfigurationName;
    parentBuildConfigurations;
    inheritsNames = [];
    hidden;
    properties = {};
    dependencies = {};
    devDependencies = {};
    jsonBuildConfiguration;
    substitutionsVariables;
    matrixParameters;
    _actions;
    _buildFolderRelativePath;
    _inheritedNamesSet = new Set();
    _isInitialised = false;
    isTemplate;
    constructor({ buildConfigurationName, templateBuildConfigurationName, jsonBuildConfiguration, parentBuildConfigurations, matrixParameters, }) {
        assert(buildConfigurationName);
        assert(jsonBuildConfiguration);
        assert(parentBuildConfigurations);
        const log = parentBuildConfigurations.log;
        log.trace(`${XpmLiquidBuildConfiguration.name}(${buildConfigurationName})`);
        this.buildConfigurationName = buildConfigurationName;
        this.jsonBuildConfiguration = jsonBuildConfiguration;
        this.parentBuildConfigurations = parentBuildConfigurations;
        if (matrixParameters !== undefined) {
            this.matrixParameters = matrixParameters;
        }
        if (templateBuildConfigurationName !== undefined) {
            this.templateBuildConfigurationName = templateBuildConfigurationName;
        }
        this.substitutionsVariables = {
            ...this.parentBuildConfigurations.substitutionsVariables,
        };
        this.hidden = this.jsonBuildConfiguration.hidden ?? false;
        this.isTemplate = this.templateBuildConfigurationName !== undefined;
    }
    async initialise() {
        const log = this.parentBuildConfigurations.log;
        log.trace(`${XpmLiquidBuildConfiguration.name}.initialise()` +
            ` @${this.buildConfigurationName}`);
        if (this._isInitialised) {
            log.trace(`${XpmLiquidBuildConfiguration.name}.initialise()` +
                ` @${this.buildConfigurationName} again`);
            return false;
        }
        log.trace(`${XpmLiquidBuildConfiguration.name}.initialise()` +
            ` @${this.buildConfigurationName}`);
        let localJsonBuildConfiguration;
        if (this.isTemplate) {
            const stringifiedJsonBuildConfiguration = JSON.stringify(this.jsonBuildConfiguration);
            if (stringifiedJsonBuildConfiguration.includes('{{') ||
                stringifiedJsonBuildConfiguration.includes('{%')) {
                let substitutedJsonBuildConfiguration;
                try {
                    substitutedJsonBuildConfiguration = await performSubstitutions({
                        log,
                        engine: this.parentBuildConfigurations.engine,
                        input: stringifiedJsonBuildConfiguration,
                        substitutionsVariables: {
                            ...this.substitutionsVariables,
                            matrix: this.matrixParameters ?? {},
                            configuration: {
                                ...this.jsonBuildConfiguration,
                                name: this.buildConfigurationName,
                            },
                        },
                    });
                }
                catch (error) {
                    const message = getErrorMessage(error) +
                        ` in buildConfiguration "${this.buildConfigurationName}"`;
                    throw new XpmError(message);
                }
                localJsonBuildConfiguration = JSON.parse(substitutedJsonBuildConfiguration);
            }
            else {
                localJsonBuildConfiguration = this.jsonBuildConfiguration;
            }
        }
        else {
            const stringifiedJsonInherits = JSON.stringify(this.jsonBuildConfiguration.inherits ?? {});
            if (stringifiedJsonInherits.includes('{{') ||
                stringifiedJsonInherits.includes('{%')) {
                let substitutedJsonInherits;
                try {
                    substitutedJsonInherits = await performSubstitutions({
                        log,
                        engine: this.parentBuildConfigurations.engine,
                        input: stringifiedJsonInherits,
                        substitutionsVariables: {
                            ...this.substitutionsVariables,
                            configuration: {
                                ...this.jsonBuildConfiguration,
                                name: this.buildConfigurationName,
                            },
                        },
                    });
                }
                catch (error) {
                    const message = getErrorMessage(error) +
                        ` in buildConfiguration "${this.buildConfigurationName}" inherits`;
                    throw new XpmError(message);
                }
                localJsonBuildConfiguration = {
                    ...this.jsonBuildConfiguration,
                    inherits: JSON.parse(substitutedJsonInherits),
                };
            }
            else {
                localJsonBuildConfiguration = this.jsonBuildConfiguration;
            }
        }
        let jsonInherits = [];
        if (isString(localJsonBuildConfiguration.inherits)) {
            jsonInherits = [localJsonBuildConfiguration.inherits];
        }
        else if (Array.isArray(localJsonBuildConfiguration.inherits)) {
            jsonInherits = localJsonBuildConfiguration.inherits;
        }
        else if (isString(localJsonBuildConfiguration.inherit)) {
            jsonInherits = [localJsonBuildConfiguration.inherit];
        }
        else if (Array.isArray(localJsonBuildConfiguration.inherit)) {
            jsonInherits = localJsonBuildConfiguration.inherit;
        }
        let inheritsNames = jsonInherits;
        if (jsonInherits.length > 0) {
            const joinedInherits = jsonInherits.join(os.EOL);
            inheritsNames = joinedInherits.split(os.EOL);
        }
        this.inheritsNames = inheritsNames;
        log.trace(this.buildConfigurationName, 'inherits from', this.inheritsNames);
        const inheritedActionsMap = new Map();
        for (const inheritedBuildConfigurationName of inheritsNames) {
            if (this.parentBuildConfigurations.hasJson(inheritedBuildConfigurationName)) {
                if (inheritedBuildConfigurationName.trim() === '') {
                    continue;
                }
                if (this._inheritedNamesSet.has(inheritedBuildConfigurationName)) {
                    throw new XpmInputError('buildConfiguration' +
                        ` '${this.buildConfigurationName}'` +
                        ' inherits from circular reference' +
                        ` '${inheritedBuildConfigurationName}'`);
                }
                this._inheritedNamesSet.add(inheritedBuildConfigurationName);
                const inheritedBuildConfiguration = this.parentBuildConfigurations.get(inheritedBuildConfigurationName);
                await inheritedBuildConfiguration.initialise();
                this.properties = {
                    ...this.properties,
                    ...inheritedBuildConfiguration.properties,
                };
                this.dependencies = {
                    ...this.dependencies,
                    ...inheritedBuildConfiguration.dependencies,
                };
                this.devDependencies = {
                    ...this.devDependencies,
                    ...inheritedBuildConfiguration.devDependencies,
                };
                await inheritedBuildConfiguration.actions.initialise();
                for (const actionName of inheritedBuildConfiguration.actions.names()) {
                    const action = inheritedBuildConfiguration.actions.get(actionName);
                    inheritedActionsMap.set(actionName, action);
                }
            }
            else {
                throw new XpmInputError('buildConfiguration' +
                    ` '${this.buildConfigurationName}'` +
                    ' inherits from missing' +
                    ` '${inheritedBuildConfigurationName}'`);
            }
        }
        this.properties = {
            ...this.properties,
            ...localJsonBuildConfiguration.properties,
        };
        assert(this.buildConfigurationName, 'buildConfigurationName missing');
        this.substitutionsVariables = {
            ...this.parentBuildConfigurations.substitutionsVariables,
            properties: {
                ...this.substitutionsVariables.properties,
                ...this.properties,
            },
            matrix: this.matrixParameters ?? {},
            configuration: {
                ...localJsonBuildConfiguration,
                name: this.buildConfigurationName,
            },
        };
        if (!this.hidden) {
            this._buildFolderRelativePath = await this._getBuildFolderRelativePath();
            const properties = this.substitutionsVariables.properties;
            properties.buildFolderRelativePath = this._buildFolderRelativePath;
        }
        this.dependencies = {
            ...this.dependencies,
            ...localJsonBuildConfiguration.dependencies,
        };
        this.devDependencies = {
            ...this.devDependencies,
            ...localJsonBuildConfiguration.devDependencies,
        };
        const unsubstitutedDependencies = {
            dependencies: this.dependencies,
            devDependencies: this.devDependencies,
        };
        const stringifiedDependencies = JSON.stringify(unsubstitutedDependencies);
        if (stringifiedDependencies.includes('{{') ||
            stringifiedDependencies.includes('{%')) {
            let substitutedDependencies;
            try {
                substitutedDependencies = await performSubstitutions({
                    log,
                    engine: this.parentBuildConfigurations.engine,
                    input: stringifiedDependencies,
                    substitutionsVariables: this.substitutionsVariables,
                });
            }
            catch (error) {
                const message = getErrorMessage(error) +
                    ` in buildConfiguration "${this.buildConfigurationName}" dependencies`;
                throw new XpmError(message);
            }
            const parsedDependencies = JSON.parse(substitutedDependencies);
            this.dependencies = parsedDependencies.dependencies ?? {};
            this.devDependencies = parsedDependencies.devDependencies ?? {};
        }
        this._actions = new XpmLiquidActions({
            log: this.parentBuildConfigurations.log,
            engine: this.parentBuildConfigurations.engine,
            substitutionsVariables: this.substitutionsVariables,
            inheritedActionsMap,
            jsonActions: localJsonBuildConfiguration.actions,
            buildConfiguration: this,
        });
        log.trace(`${XpmLiquidBuildConfiguration.name}.initialise() `, `@{this.buildConfigurationName}`);
        if (!this.hidden) {
            log.trace(this.buildConfigurationName, 'buildFolderRelativePath =>', this._buildFolderRelativePath);
        }
        log.trace(this.buildConfigurationName, 'properties => ', this.properties);
        log.trace(this.buildConfigurationName, 'dependencies => ', this.dependencies);
        log.trace(this.buildConfigurationName, 'devDependencies => ', this.devDependencies);
        log.trace(this.buildConfigurationName, 'actions => ', this._actions.names());
        this._isInitialised = true;
        return true;
    }
    get actions() {
        assert(this._actions !== undefined);
        return this._actions;
    }
    get buildFolderRelativePath() {
        assert(this._buildFolderRelativePath !== undefined);
        return this._buildFolderRelativePath;
    }
    async _getBuildFolderRelativePath() {
        const log = this.parentBuildConfigurations.log;
        let folderPath;
        if (buildFolderRelativePathPropertyName in
            this.substitutionsVariables.properties) {
            folderPath = this.substitutionsVariables.properties[buildFolderRelativePathPropertyName];
            if (folderPath !== '') {
                try {
                    const substitutedFolderPath = await performSubstitutions({
                        log,
                        engine: this.parentBuildConfigurations.engine,
                        input: folderPath,
                        substitutionsVariables: this.substitutionsVariables,
                    });
                    return substitutedFolderPath;
                }
                catch (error) {
                    log.trace(error);
                }
            }
        }
        const defaultFolderPath = path.join('build', filterPath(this.buildConfigurationName));
        return defaultFolderPath;
    }
}
//# sourceMappingURL=liquid-build-configurations.js.map