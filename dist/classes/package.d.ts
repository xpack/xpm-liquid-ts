import { Logger } from '@xpack/logger';
import { JsonPackageSpecifier, JsonXpmPackage } from '../types/json.js';
export interface PackageConstructorParameters {
    packageFolderPath: string;
    log: Logger;
}
export declare class Package {
    packageFolderPath: string;
    jsonPackage?: JsonXpmPackage;
    protected _log: Logger;
    constructor({ packageFolderPath, log }: PackageConstructorParameters);
    readPackageDotJson({ withThrow, }?: {
        withThrow?: boolean;
    }): Promise<JsonXpmPackage | undefined>;
    rewritePackageDotJson(jsonPackage: JsonXpmPackage): Promise<void>;
    isNpmPackage(): boolean;
    isXpmPackage(): boolean;
    isBinaryXpmPackage(): boolean;
    isNodeModule(): boolean;
    isBinaryNodeModule(): boolean;
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