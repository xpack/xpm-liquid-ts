export type InitTemplatePropertiesDefinitions = Record<string, InitTemplatePropertiesDefinition>;
export interface InitTemplatePropertiesDefinition {
    label: string;
    description: string;
    type: InitTemplateType;
    items?: InitTemplateItems;
    isMandatory?: boolean;
    default?: string | number | boolean;
}
export type InitTemplateType = 'select' | 'string' | 'number' | 'boolean';
export type InitTemplateItems = Record<string, string | InitTemplateItemValue>;
export type InitTemplatePlatform = 'linux' | 'linux-x64' | 'linux-arm64' | 'win32' | 'darwin' | 'darwin-x64' | 'darwin-arm64';
export interface InitTemplateItemValue {
    platforms: InitTemplatePlatform[];
    message: string;
}
export interface InitTemplateSubstitutionsVariables {
    properties: Record<string, string | boolean | number>;
    [key: string]: unknown;
}
//# sourceMappingURL=xpm-init-template.d.ts.map