import { Liquid, LiquidOptions } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { InitTemplatePropertiesDefinitions, InitTemplateSubstitutionsVariables } from '../types/xpm-init-template.js';
import { Context } from '../types/xpm.js';
import type { Policies } from './policies.js';
export interface InitTemplateConstructorParameters {
    context: Context;
    templatesFolderPath: string;
    propertiesDefinitions: InitTemplatePropertiesDefinitions;
    process?: NodeJS.Process;
    options?: LiquidOptions;
    policies: Policies;
}
export declare abstract class InitTemplateBase {
    readonly context: Context;
    readonly log: Logger;
    readonly propertiesDefinitions: InitTemplatePropertiesDefinitions;
    readonly templatesFolderPath: string;
    readonly engine: Liquid;
    substitutionsVariables?: InitTemplateSubstitutionsVariables;
    isInteractive: boolean;
    readonly process: NodeJS.Process;
    policies: Policies;
    constructor({ context, templatesFolderPath, propertiesDefinitions, process: _process, options, policies, }: InitTemplateConstructorParameters);
    run(): Promise<number>;
    abstract generate(): Promise<void>;
    isPlatformSupported(platforms: string[] | undefined): boolean;
    copyFile({ sourceFileRelativePath, destinationFilePath, }: {
        sourceFileRelativePath: string;
        destinationFilePath?: string;
    }): Promise<void>;
    copyFolder({ sourceFolderRelativePath, destinationFolderPath, }: {
        sourceFolderRelativePath: string;
        destinationFolderPath?: string;
    }): Promise<void>;
    render({ sourceFilePath, destinationFilePath, substitutionsVariables, }: {
        sourceFilePath: string;
        destinationFilePath: string;
        substitutionsVariables?: InitTemplateSubstitutionsVariables;
    }): Promise<void>;
    validatePropertyValue(name: string, value: string): string | boolean | number;
    protected _askForMoreValues(): Promise<void>;
    protected _copyFolderRecursively({ sourceFolderPath, destinationFolderPath, }: {
        sourceFolderPath: string;
        destinationFolderPath: string;
    }): Promise<void>;
    protected _validatePropertiesDefinitions(): void;
}
//# sourceMappingURL=init-template-base.d.ts.map