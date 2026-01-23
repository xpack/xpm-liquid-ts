import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { XpmContext } from '../types/xpm.js';
import { XpmInitTemplatePropertiesDefinitions, XpmInitTemplateSubstitutionsVariables } from '../types/xpm-init-template.js';
export declare abstract class XpmInitTemplateBase {
    context: XpmContext;
    log: Logger;
    propertiesDefinitions: XpmInitTemplatePropertiesDefinitions;
    __dirname: string;
    templatesPath: string;
    engine: Liquid;
    substitutionsVariables?: XpmInitTemplateSubstitutionsVariables;
    constructor({ context, __dirname, templatesPath, propertiesDefinitions, }: {
        context: XpmContext;
        __dirname: string;
        templatesPath: string;
        propertiesDefinitions: XpmInitTemplatePropertiesDefinitions;
    });
    run(): Promise<number>;
    abstract generate(isInteractive: boolean): Promise<void>;
    validateValue(name: string, value: string): string | boolean | number;
    askForMoreValues(): Promise<void>;
    isPlatformSupported(platforms: string[] | undefined): boolean;
    copyFile(sourceFileRelativePath: string, destinationFilePath?: string): Promise<void>;
    copyFolder(source: string, destination?: string): Promise<void>;
    protected _copyFolderRecursively(sourceFolderPath: string, destinationFolderPath: string): Promise<void>;
    render(inputFileRelativePath: string, outputFileRelativePath: string, substitutionsVariables?: XpmInitTemplateSubstitutionsVariables): Promise<void>;
}
//# sourceMappingURL=init-template-base.d.ts.map