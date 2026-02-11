import assert from 'node:assert';
import * as os from 'node:os';
import { liquidSubstitutionsVariablesBase, } from '../data/substitutions-variables.js';
import { isJsonObject } from '../functions/is-something.js';
import { Actions } from './actions.js';
import { BuildConfigurations } from './build-configurations.js';
import { LiquidEngine } from './liquid-engine.js';
export const buildFolderRelativePathPropertyName = 'buildFolderRelativePath';
export class DataModel {
    substitutionsVariables;
    actions;
    buildConfigurations;
    _log;
    _engine;
    _jsonPackage;
    constructor({ jsonPackage, log }) {
        log.trace(`${DataModel.name}()`);
        this._log = log;
        this._engine = new LiquidEngine();
        assert(isJsonObject(jsonPackage.xpack), 'xpack section missing in package.json');
        this._jsonPackage = jsonPackage;
        assert(typeof os.version === 'function', 'Mandatory os.version available only since 12.x');
        this.substitutionsVariables = {
            ...liquidSubstitutionsVariablesBase,
            package: jsonPackage,
        };
        if (isJsonObject(jsonPackage.xpack.properties)) {
            this.substitutionsVariables.properties = {
                ...jsonPackage.xpack.properties,
            };
        }
        Object.seal(this.substitutionsVariables);
        this.actions = new Actions({
            log: this._log,
            engine: this._engine,
            substitutionsVariables: this.substitutionsVariables,
            jsonActions: this._jsonPackage.xpack.actions,
        });
        this.buildConfigurations = new BuildConfigurations({
            log: this._log,
            engine: this._engine,
            substitutionsVariables: this.substitutionsVariables,
            jsonBuildConfigurations: this._jsonPackage.xpack.buildConfigurations,
        });
    }
}
//# sourceMappingURL=data-model.js.map