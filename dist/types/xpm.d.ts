import { Logger } from '@xpack/logger';
export type ActionCommands = string[];
export interface Config {
    doForce?: boolean;
    doSkipIfInstalled?: boolean;
    isDryRun?: boolean;
    properties?: Record<string, string | boolean | number>;
    cwd: string;
    [key: string]: unknown;
}
export interface Context {
    log: Logger;
    config: Config;
    [key: string]: any;
}
//# sourceMappingURL=xpm.d.ts.map