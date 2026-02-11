import { Logger } from '@xpack/logger';
export interface PoliciesConstructorParameters {
    minVersion: string;
    log: Logger;
}
export declare class Policies {
    minVersion: string;
    shareNpmDependencies: boolean;
    nonHierarchicalLocalXpacksFolder: boolean;
    onlyStringDependencies: boolean;
    singleParameterXpmInitTemplate: boolean;
    constructor({ minVersion, log }: PoliciesConstructorParameters);
}
//# sourceMappingURL=policies.d.ts.map