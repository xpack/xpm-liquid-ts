import * as os from 'node:os';
export type LiquidSubstitutionsStrings = Record<string, string | string[]>;
export interface LiquidSubstitutionsVariables {
    env: NodeJS.ProcessEnv;
    os: {
        EOL: string;
        arch: string;
        constants: {
            signals: Record<string, number>;
            errno: Record<string, number>;
        };
        cpus: os.CpuInfo[];
        endianness: 'BE' | 'LE';
        homedir: string;
        hostname: string;
        platform: NodeJS.Platform;
        release: string;
        tmpdir: string;
        type: string;
        version: string;
    };
    path: {
        delimiter: string;
        sep: string;
        win32: {
            delimiter: string;
            sep: string;
        };
        posix: {
            delimiter: string;
            sep: string;
        };
    };
    package?: any;
    configuration?: {
        name: string;
        [key: string]: any;
    };
    properties: LiquidSubstitutionsStrings;
    matrix?: LiquidSubstitutionsStrings;
}
export declare const liquidSubstitutionsVariablesBase: LiquidSubstitutionsVariables;
//# sourceMappingURL=substitutions-variables.d.ts.map