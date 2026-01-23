import { Logger } from '@xpack/logger';
export declare class XpmPolicies {
    minVersion: string;
    shareNpmDependencies: boolean;
    nonHierarchicalLocalXpacksFolder: boolean;
    onlyStringDependencies: boolean;
    singleParameterXpmInitTemplate: boolean;
    constructor({ log, minVersion }: {
        log: Logger;
        minVersion: string;
    });
}
//# sourceMappingURL=policies.d.ts.map