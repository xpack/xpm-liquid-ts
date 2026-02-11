import { Logger } from '@xpack/logger';
export type MatrixCombination = Record<string, string>;
export interface CombinationsGeneratorConstructorParameters {
    matrixKeys: string[];
    matrixValues: string[][];
    log: Logger;
}
export declare class CombinationsGenerator {
    protected readonly log: Logger;
    protected readonly matrixKeys: string[];
    protected readonly matrixValues: string[][];
    protected readonly combinations: MatrixCombination[];
    constructor({ matrixKeys, matrixValues, log, }: CombinationsGeneratorConstructorParameters);
    generate(): MatrixCombination[];
    protected _generateRecursively(index: number, combination: Record<string, string>): void;
}
//# sourceMappingURL=combinations-generator.d.ts.map