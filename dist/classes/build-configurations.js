import assert from 'node:assert';
import * as path from 'node:path';
import * as os from 'node:os';
import { filterPath } from '../functions/filter-paths.js';
import { isJsonObject, isJsonArray, isString, } from '../functions/is-something.js';
import { performSubstitutions } from '../functions/perform-substitutions.js';
import { getErrorMessage } from '../functions/utils.js';
import { Actions } from './actions.js';
import { CombinationsGenerator } from './combinations-generator.js';
import { buildFolderRelativePathPropertyName } from './data-model.js';
import { ConfigurationError, InputError } from './errors.js';
export class BuildConfigurations {
    log;
    engine;
    substitutionsVariables;
    jsonBuildConfigurations;
    _buildConfigurationsMap = new Map();
    _jsonBuildConfigurationsNamesMap = new Map();
    _buildComfigurationsNamesSet = new Set();
    _isInitialised = false;
    _buildConfigurationsNames = [];
    constructor({ engine, substitutionsVariables, jsonBuildConfigurations, log, }) {
        assert(log, 'log is required');
        assert(engine, 'engine is required');
        assert(substitutionsVariables, 'substitutionsVariables is required');
        log.trace(`${BuildConfigurations.name}()`);
        this.log = log;
        this.engine = engine;
        this.substitutionsVariables = substitutionsVariables;
        this.jsonBuildConfigurations = jsonBuildConfigurations ?? {};
    }
    async initialise() {
        const log = this.log;
        if (this._isInitialised) {
            log.trace(`${BuildConfigurations.name}.initialise() again`);
            return false;
        }
        log.trace(`${BuildConfigurations.name}.initialise()`);
        for (const [buildConfigurationName, jsonBuildConfiguration,] of Object.entries(this.jsonBuildConfigurations)) {
            if (buildConfigurationName.includes('{{')) {
                await this._processTemplate({
                    buildConfigurationName,
                    jsonBuildConfigurationTemplate: jsonBuildConfiguration,
                });
            }
            else {
                if (this._buildComfigurationsNamesSet.has(buildConfigurationName)) {
                    throw new ConfigurationError(`build configuration name ` +
                        `"${buildConfigurationName}" already defined.`);
                }
                else {
                    this._buildConfigurationsMap.set(buildConfigurationName, undefined);
                    this._jsonBuildConfigurationsNamesMap.set(buildConfigurationName, buildConfigurationName);
                    this._buildComfigurationsNamesSet.add(buildConfigurationName);
                }
            }
        }
        const buildConfigurationsNames = Array.from(this._buildConfigurationsMap.keys());
        this._buildConfigurationsNames = buildConfigurationsNames;
        log.trace(`${BuildConfigurations.name}.initialise() =>`, buildConfigurationsNames);
        this._isInitialised = true;
        return true;
    }
    get size() {
        return this._buildConfigurationsMap.size;
    }
    get isEmpty() {
        return this._buildConfigurationsMap.size === 0;
    }
    get names() {
        return this._buildConfigurationsNames;
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
        log.trace(`${BuildConfigurations.name}.get(${buildConfigurationName})`);
        let buildConfiguration = this._buildConfigurationsMap.get(buildConfigurationName);
        if (buildConfiguration === undefined) {
            if (!this._jsonBuildConfigurationsNamesMap.has(buildConfigurationName)) {
                throw new InputError(`buildConfiguration "${buildConfigurationName}" ` + `does not exist`);
            }
            const jsonBuildConfigurationName = this._jsonBuildConfigurationsNamesMap.get(buildConfigurationName);
            const jsonBuildConfiguration = (this.jsonBuildConfigurations[jsonBuildConfigurationName] ??
                {});
            buildConfiguration = new BuildConfiguration({
                buildConfigurationName,
                jsonBuildConfiguration,
                parentBuildConfigurations: this,
            });
            this._buildConfigurationsMap.set(buildConfigurationName, buildConfiguration);
        }
        return buildConfiguration;
    }
    async _processTemplate({ buildConfigurationName, jsonBuildConfigurationTemplate, }) {
        try {
            const expandedBuildConfigurationsMap = await this._expandTemplateBuildConfigurations({
                buildConfigurationName,
                jsonBuildConfigurationTemplate,
            });
            for (const [expandedBuildConfigurationName, expandedBuildConfiguration,] of expandedBuildConfigurationsMap) {
                if (this._buildComfigurationsNamesSet.has(expandedBuildConfigurationName)) {
                    throw new ConfigurationError(`duplicate build configuration name ` +
                        `"${expandedBuildConfigurationName}" ` +
                        `could not be generated from template.`);
                }
                else {
                    this._buildConfigurationsMap.set(expandedBuildConfigurationName, expandedBuildConfiguration);
                    this._jsonBuildConfigurationsNamesMap.set(expandedBuildConfigurationName, buildConfigurationName);
                    this._buildComfigurationsNamesSet.add(expandedBuildConfigurationName);
                }
            }
        }
        catch (error) {
            const message = getErrorMessage(error) +
                ` in buildConfiguration "${buildConfigurationName}"`;
            throw new ConfigurationError(message);
        }
    }
    async _expandTemplateBuildConfigurations({ buildConfigurationName, jsonBuildConfigurationTemplate, }) {
        const log = this.log;
        log.trace(`${BuildConfigurations.name}.` +
            `#expandTemplateBuildConfigurations(${buildConfigurationName})`);
        const newBuildConfigurationsMap = new Map();
        if (!isJsonObject(jsonBuildConfigurationTemplate.matrix)) {
            throw new ConfigurationError(`buildConfiguration "${buildConfigurationName}" ` +
                `matrix is not an object`);
        }
        if (!isJsonObject(jsonBuildConfigurationTemplate.template)) {
            throw new ConfigurationError(`buildConfiguration "${buildConfigurationName}" ` +
                `template is not a JSON object`);
        }
        const matrixKeys = [];
        const matrixValues = [];
        for (const [matrixKey, matrixValueArray] of Object.entries(jsonBuildConfigurationTemplate.matrix)) {
            if (!isJsonArray(matrixValueArray)) {
                throw new ConfigurationError(`buildConfiguration "${buildConfigurationName}" ` +
                    `matrix.${matrixKey} is not an array`);
            }
            for (const matrixValue of matrixValueArray) {
                if (!isString(matrixValue)) {
                    throw new ConfigurationError(`buildConfiguration "${buildConfigurationName}" ` +
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
                    throw new ConfigurationError(message);
                }
                matrixValues.push(substitutedValue.replace(new RegExp(os.EOL + '$'), '').split(os.EOL));
            }
            else {
                matrixValues.push(matrixValueArray);
            }
        }
        const combinationsGenerator = new CombinationsGenerator({
            matrixKeys,
            matrixValues,
            log: this.log,
        });
        const combinations = combinationsGenerator.generate();
        log.trace('combinations =>', combinations);
        for (const combination of combinations) {
            await this._createSubstitutedBuildConfiguration({
                buildConfigurationName,
                jsonBuildConfiguration: jsonBuildConfigurationTemplate.template,
                combination,
                newBuildConfigurationsMap,
            });
        }
        return newBuildConfigurationsMap;
    }
    async _createSubstitutedBuildConfiguration({ buildConfigurationName, jsonBuildConfiguration, combination, newBuildConfigurationsMap, }) {
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
            throw new ConfigurationError(message);
        }
        const newBuildConfiguration = new BuildConfiguration({
            buildConfigurationName: substitutedBuildConfigurationName,
            templateBuildConfigurationName: buildConfigurationName,
            jsonBuildConfiguration,
            parentBuildConfigurations: this,
            matrixParameters: { ...combination },
        });
        newBuildConfigurationsMap.set(substitutedBuildConfigurationName, newBuildConfiguration);
    }
}
export class BuildConfiguration {
    buildConfigurationName;
    templateBuildConfigurationName;
    parentBuildConfigurations;
    inheritsNames = [];
    isHidden;
    properties = {};
    dependencies = {};
    devDependencies = {};
    jsonBuildConfiguration;
    isTemplate;
    _log;
    _substitutionsVariables;
    matrixParameters;
    _actions;
    _buildFolderRelativePath;
    _inheritedNamesSet = new Set();
    _isInitialised = false;
    constructor({ buildConfigurationName, templateBuildConfigurationName, jsonBuildConfiguration, parentBuildConfigurations, matrixParameters, }) {
        assert(buildConfigurationName, 'buildConfigurationName is required');
        assert(jsonBuildConfiguration, 'jsonBuildConfiguration is required');
        assert(parentBuildConfigurations, 'parentBuildConfigurations is required');
        const log = parentBuildConfigurations.log;
        this._log = log;
        log.trace(`${BuildConfiguration.name}(${buildConfigurationName})`);
        this.buildConfigurationName = buildConfigurationName;
        this.jsonBuildConfiguration = jsonBuildConfiguration;
        this.parentBuildConfigurations = parentBuildConfigurations;
        if (matrixParameters !== undefined) {
            this.matrixParameters = matrixParameters;
        }
        if (templateBuildConfigurationName !== undefined) {
            this.templateBuildConfigurationName = templateBuildConfigurationName;
        }
        this._substitutionsVariables = {
            ...this.parentBuildConfigurations.substitutionsVariables,
        };
        this.isHidden = this.jsonBuildConfiguration.hidden ?? false;
        this.isTemplate = this.templateBuildConfigurationName !== undefined;
    }
    async initialise() {
        const log = this._log;
        log.trace(`${BuildConfiguration.name}.initialise()` +
            ` @${this.buildConfigurationName}`);
        if (this._isInitialised) {
            log.trace(`${BuildConfiguration.name}.initialise()` +
                ` @${this.buildConfigurationName} again`);
            return false;
        }
        log.trace(`${BuildConfiguration.name}.initialise()` +
            ` @${this.buildConfigurationName}`);
        let localJsonBuildConfiguration;
        if (this.isTemplate) {
            localJsonBuildConfiguration = await this._substituteTemplate();
        }
        else {
            localJsonBuildConfiguration = await this._substituteInherits();
        }
        const inheritedActionsMap = await this._processInherits(localJsonBuildConfiguration);
        this.properties = {
            ...this.properties,
            ...localJsonBuildConfiguration.properties,
        };
        assert(this.buildConfigurationName, 'buildConfigurationName missing');
        this._substitutionsVariables = {
            ...this.parentBuildConfigurations.substitutionsVariables,
            properties: {
                ...this._substitutionsVariables.properties,
                ...this.properties,
            },
            matrix: this.matrixParameters ?? {},
            configuration: {
                ...localJsonBuildConfiguration,
                name: this.buildConfigurationName,
            },
        };
        if (!this.isHidden) {
            this._buildFolderRelativePath = await this._getBuildFolderRelativePath();
            const properties = this._substitutionsVariables.properties;
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
                    substitutionsVariables: this._substitutionsVariables,
                });
            }
            catch (error) {
                const message = getErrorMessage(error) +
                    ` in buildConfiguration "${this.buildConfigurationName}" dependencies`;
                throw new ConfigurationError(message);
            }
            const parsedDependencies = JSON.parse(substitutedDependencies);
            this.dependencies = parsedDependencies.dependencies ?? {};
            this.devDependencies = parsedDependencies.devDependencies ?? {};
        }
        this._actions = new Actions({
            log: this._log,
            engine: this.parentBuildConfigurations.engine,
            substitutionsVariables: this._substitutionsVariables,
            inheritedActionsMap,
            jsonActions: localJsonBuildConfiguration.actions,
            buildConfiguration: this,
        });
        log.trace(`${BuildConfiguration.name}.initialise() `, `@{this.buildConfigurationName}`);
        if (!this.isHidden) {
            log.trace(this.buildConfigurationName, 'buildFolderRelativePath =>', this._buildFolderRelativePath);
        }
        log.trace(this.buildConfigurationName, 'properties => ', this.properties);
        log.trace(this.buildConfigurationName, 'dependencies => ', this.dependencies);
        log.trace(this.buildConfigurationName, 'devDependencies => ', this.devDependencies);
        log.trace(this.buildConfigurationName, 'actions => ', this._actions.names);
        this._isInitialised = true;
        return true;
    }
    get actions() {
        assert(this._actions !== undefined, 'Actions not initialised');
        return this._actions;
    }
    get buildFolderRelativePath() {
        assert(this._buildFolderRelativePath !== undefined, 'Actions not initialised');
        return this._buildFolderRelativePath;
    }
    async _substituteTemplate() {
        const log = this._log;
        let localJsonBuildConfiguration;
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
                        ...this._substitutionsVariables,
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
                throw new ConfigurationError(message);
            }
            localJsonBuildConfiguration = JSON.parse(substitutedJsonBuildConfiguration);
        }
        else {
            localJsonBuildConfiguration = this.jsonBuildConfiguration;
        }
        return localJsonBuildConfiguration;
    }
    async _substituteInherits() {
        const log = this._log;
        let localJsonBuildConfiguration;
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
                        ...this._substitutionsVariables,
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
                throw new ConfigurationError(message);
            }
            localJsonBuildConfiguration = {
                ...this.jsonBuildConfiguration,
                inherits: JSON.parse(substitutedJsonInherits),
            };
        }
        else {
            localJsonBuildConfiguration = this.jsonBuildConfiguration;
        }
        return localJsonBuildConfiguration;
    }
    async _processInherits(localJsonBuildConfiguration) {
        const log = this._log;
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
            if (inheritedBuildConfigurationName.trim() === '') {
                continue;
            }
            if (this.parentBuildConfigurations.hasJson(inheritedBuildConfigurationName)) {
                if (this._inheritedNamesSet.has(inheritedBuildConfigurationName)) {
                    throw new InputError('buildConfiguration' +
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
                for (const actionName of inheritedBuildConfiguration.actions.names) {
                    const action = inheritedBuildConfiguration.actions.get(actionName);
                    inheritedActionsMap.set(actionName, action);
                }
            }
            else {
                throw new InputError('buildConfiguration' +
                    ` '${this.buildConfigurationName}'` +
                    ' inherits from missing' +
                    ` '${inheritedBuildConfigurationName}'`);
            }
        }
        return inheritedActionsMap;
    }
    async _getBuildFolderRelativePath() {
        const log = this._log;
        let folderPath;
        if (buildFolderRelativePathPropertyName in
            this._substitutionsVariables.properties) {
            folderPath = this._substitutionsVariables.properties[buildFolderRelativePathPropertyName];
            if (folderPath !== '') {
                try {
                    const substitutedFolderPath = await performSubstitutions({
                        log,
                        engine: this.parentBuildConfigurations.engine,
                        input: folderPath,
                        substitutionsVariables: this._substitutionsVariables,
                    });
                    return substitutedFolderPath;
                }
                catch (error) {
                    const message = getErrorMessage(error) +
                        ` in buildConfiguration "${this.buildConfigurationName}"`;
                    throw new ConfigurationError(message);
                }
            }
        }
        const defaultFolderPath = path.join('build', filterPath(this.buildConfigurationName));
        return defaultFolderPath;
    }
}
//# sourceMappingURL=build-configurations.js.map