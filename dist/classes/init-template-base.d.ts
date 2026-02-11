import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { InitTemplatePropertiesDefinitions, InitTemplateSubstitutionsVariables } from '../types/xpm-init-template.js';
import { Context } from '../types/xpm.js';
export interface InitTemplateConstructorParameters {
    context: Context;
    __dirname: string;
    templatesPath: string;
    propertiesDefinitions: InitTemplatePropertiesDefinitions;
    process?: NodeJS.Process;
}
export declare abstract class InitTemplateBase {
    protected _context: Context;
    protected _log: Logger;
    protected _propertiesDefinitions: InitTemplatePropertiesDefinitions;
    protected __dirname: string;
    protected _templatesPath: string;
    protected _engine: Liquid;
    protected _substitutionsVariables?: InitTemplateSubstitutionsVariables;
    protected _isInteractive: boolean;
    protected _process: NodeJS.Process;
    constructor({ context, __dirname, templatesPath, propertiesDefinitions, process: _process, }: InitTemplateConstructorParameters);
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
    protected _validatePropertyValue(name: string, value: string): string | boolean | number;
    protected _askForMoreValues(): Promise<void>;
    protected _copyFolderRecursively({ sourceFolderPath, destinationFolderPath, }: {
        sourceFolderPath: string;
        destinationFolderPath: string;
    }): Promise<void>;
    protected _validatePropertiesDefinitions(): void;
}
//# sourceMappingURL=init-template-base.d.ts.map