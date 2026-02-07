import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { XpmContext } from '../types/xpm.js';
import { XpmInitTemplatePropertiesDefinitions, XpmInitTemplateSubstitutionsVariables } from '../types/xpm-init-template.js';
export interface XpmInitTemplateConstructorParameters {
    context: XpmContext;
    __dirname: string;
    templatesPath: string;
    propertiesDefinitions: XpmInitTemplatePropertiesDefinitions;
    process?: NodeJS.Process;
}
export declare abstract class XpmInitTemplateBase {
    protected _context: XpmContext;
    protected _log: Logger;
    protected _propertiesDefinitions: XpmInitTemplatePropertiesDefinitions;
    protected __dirname: string;
    protected _templatesPath: string;
    protected _engine: Liquid;
    protected _substitutionsVariables?: XpmInitTemplateSubstitutionsVariables;
    protected _isInteractive: boolean;
    protected _process: NodeJS.Process;
    constructor({ context, __dirname, templatesPath, propertiesDefinitions, process: _process, }: XpmInitTemplateConstructorParameters);
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
        substitutionsVariables?: XpmInitTemplateSubstitutionsVariables;
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