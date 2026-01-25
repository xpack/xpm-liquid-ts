import assert from 'node:assert';
import * as os from 'node:os';
import { isJsonObject } from '../functions/is-something.js';
import { xpmLiquidSubstitutionsVariablesBase, } from '../data/substitutions-variables.js';
import { XpmLiquidEngine } from './liquid-engine.js';
import { XpmActions } from './actions.js';
import { XpmBuildConfigurations } from './build-configurations.js';
export const buildFolderRelativePathPropertyName = 'buildFolderRelativePath';
export class XpmDataModel {
    _log;
    _engine;
    _jsonPackage;
    substitutionsVariables;
    actions;
    buildConfigurations;
    constructor({ log, jsonPackage, }) {
        log.trace(`${XpmDataModel.name}()`);
        this._log = log;
        this._engine = new XpmLiquidEngine();
        assert(isJsonObject(jsonPackage.xpack), 'xpack section missing in package.json');
        this._jsonPackage = jsonPackage;
        assert(typeof os.version === 'function', 'Mandatory os.version available only since 12.x');
        this.substitutionsVariables = {
            ...xpmLiquidSubstitutionsVariablesBase,
            package: jsonPackage,
        };
        if (isJsonObject(jsonPackage.xpack.properties)) {
            this.substitutionsVariables.properties = {
                ...jsonPackage.xpack.properties,
            };
        }
        Object.seal(this.substitutionsVariables);
        this.actions = new XpmActions({
            log: this._log,
            engine: this._engine,
            substitutionsVariables: this.substitutionsVariables,
            jsonActions: this._jsonPackage.xpack.actions,
        });
        this.buildConfigurations = new XpmBuildConfigurations({
            log: this._log,
            engine: this._engine,
            substitutionsVariables: this.substitutionsVariables,
            jsonBuildConfigurations: this._jsonPackage.xpack.buildConfigurations,
        });
    }
}
//# sourceMappingURL=data-model.js.map