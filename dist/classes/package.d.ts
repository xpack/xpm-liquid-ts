import { Logger } from '@xpack/logger';
import { JsonXpmPackage } from '../types/json.js';
import { JsonPackageSpecifier } from '../types/json.js';
export declare class XpmPackage {
    packageFolderPath: string;
    jsonPackage?: JsonXpmPackage;
    protected _log: Logger;
    constructor({ log, packageFolderPath, }: {
        log: Logger;
        packageFolderPath: string;
    });
    readPackageDotJson({ withThrow, }?: {
        withThrow?: boolean;
    }): Promise<JsonXpmPackage | undefined>;
    rewritePackageDotJson(jsonPackage: JsonXpmPackage): Promise<void>;
    isNpmPackage(): boolean;
    isXpmPackage(): boolean;
    isBinaryXpmPackage(): boolean;
    isNodeModule(): false;
    isBinaryNodeModule(): false;
    hasNpmScripts(): boolean;
    hasXpmActions(): boolean;
    getMinimumXpmRequired(): string | undefined;
    checkMinimumXpmRequired({ xpmRootFolderPath, }: {
        xpmRootFolderPath: string;
    }): Promise<string | undefined>;
    parsePackageSpecifier({ npmPackageSpecifier, }: {
        npmPackageSpecifier: string;
    }): JsonPackageSpecifier;
}
//# sourceMappingURL=package.d.ts.map