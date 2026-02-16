import { Logger } from '@xpack/logger';
export declare function chmodRecursively({ inputPath, readOnly, log, depth, maxDepth, }: {
    inputPath: string;
    readOnly: boolean;
    log: Logger;
    depth?: number;
    maxDepth?: number;
}): Promise<void>;
//# sourceMappingURL=chmod-recursively.d.ts.map