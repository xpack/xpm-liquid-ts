import { Logger } from '@xpack/logger';
export type XpmActionCommands = string[];
export interface XpmConfig {
    doForce?: boolean;
    doSkipIfInstalled?: boolean;
    isDryRun?: boolean;
    properties?: Record<string, string | boolean | number>;
    cwd: string;
    [key: string]: unknown;
}
export interface XpmContext {
    log: Logger;
    config: XpmConfig;
    [key: string]: any;
}
//# sourceMappingURL=xpm.d.ts.map