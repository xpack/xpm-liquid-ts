export type XpmInitTemplatePropertiesDefinitions = Record<string, XpmInitTemplatePropertiesDefinition>;
export interface XpmInitTemplatePropertiesDefinition {
    label: string;
    description: string;
    type: XpmInitTemplateType;
    items?: XpmInitTemplateItems;
    isMandatory?: boolean;
    default?: string | number | boolean;
}
export type XpmInitTemplateType = 'select' | 'string' | 'number' | 'boolean';
export type XpmInitTemplateItems = Record<string, string | XpmInitTemplateItemValue>;
export type XpmInitTemplatePlatform = 'linux' | 'linux-x64' | 'linux-arm64' | 'win32' | 'darwin' | 'darwin-x64' | 'darwin-arm64';
export interface XpmInitTemplateItemValue {
    platforms: XpmInitTemplatePlatform[];
    message: string;
}
export interface XpmInitTemplateSubstitutionsVariables {
    properties: Record<string, string | boolean | number>;
    [key: string]: unknown;
}
//# sourceMappingURL=xpm-init-template.d.ts.map