import { Logger } from '@xpack/logger';
export type XpmMatrixCombination = Record<string, string>;
export declare class CombinationsGenerator {
    protected readonly log: Logger;
    protected readonly matrixKeys: string[];
    protected readonly matrixValues: string[][];
    protected readonly combinations: XpmMatrixCombination[];
    constructor({ matrixKeys, matrixValues, log, }: {
        matrixKeys: string[];
        matrixValues: string[][];
        log: Logger;
    });
    generate(): XpmMatrixCombination[];
    protected _generateRecursively(index: number, combination: Record<string, string>): void;
}
//# sourceMappingURL=combinations-generator.d.ts.map