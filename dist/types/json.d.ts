export type JsonPropertyValue = any;
export type JsonProperties = Record<string, JsonPropertyValue>;
export type JsonBuildConfigurationInherits = string[];
export type JsonScripts = Record<string, string>;
export type JsonDependencies = Record<string, JsonDependenciesContent>;
export type JsonDependenciesContent = string | JsonDependencyExtended;
export interface JsonDependencyExtended {
    specifier: string;
    local?: 'link' | 'copy';
    platforms?: string | string[];
}
export type JsonActionContent = string | string[];
export interface JsonActionTemplate {
    matrix: Record<string, string[]>;
    template: JsonActionContent;
}
export type JsonAction = JsonActionContent | JsonActionTemplate;
export type JsonActions = Record<string, JsonAction>;
export interface JsonBuildConfigurationContent {
    inherits?: JsonBuildConfigurationInherits | string;
    inherit?: JsonBuildConfigurationInherits | string;
    hidden?: boolean;
    properties?: JsonProperties;
    actions?: JsonActions;
    dependencies?: JsonDependencies;
    devDependencies?: JsonDependencies;
    [key: string]: JsonPropertyValue;
}
export interface JsonBuildConfigurationTemplate {
    matrix: JsonBuildConfigurationTemplateMatrix;
    template: JsonBuildConfigurationContent;
}
export type JsonBuildConfigurationTemplateMatrix = Record<string, string[]>;
export type JsonBuildConfiguration = JsonBuildConfigurationContent | JsonBuildConfigurationTemplate;
export type JsonBuildConfigurations = Record<string, JsonBuildConfiguration>;
export interface JsonXpack {
    minimumXpmRequired?: string;
    binaries?: JsonXpmBinaries;
    executables?: Record<string, string>;
    bin?: Record<string, string>;
    dependencies?: JsonDependencies;
    devDependencies?: JsonDependencies;
    properties?: JsonProperties;
    actions?: JsonActions;
    buildConfigurations?: JsonBuildConfigurations;
}
export type JsonXpmBinariesPlatforms = Record<string, JsonXpmPlatformFile>;
export interface JsonXpmBinaries {
    destination: string;
    baseUrl: string;
    skip?: number;
    platforms: JsonXpmBinariesPlatforms;
}
export interface JsonXpmPlatformFile {
    fileName: string;
    sha256?: string;
    sha512?: string;
    baseUrl?: string;
    skip?: number;
}
export interface JsonNpmPackage {
    name?: string;
    version?: string;
    scripts?: JsonScripts;
    bin?: Record<string, string> | string;
    dependencies?: JsonDependencies;
    devDependencies?: JsonDependencies;
    [key: string]: any;
}
export interface JsonXpmPackage extends JsonNpmPackage {
    xpack: JsonXpack;
}
export interface JsonPackageSpecifier {
    scope?: string;
    name?: string;
    version?: string;
}
//# sourceMappingURL=json.d.ts.map