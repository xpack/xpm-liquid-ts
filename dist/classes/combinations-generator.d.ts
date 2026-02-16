import { Logger } from '@xpack/logger';
export declare const COMBINATIONS_GENERATOR_MAX_COMBINATIONS_LIMIT: number;
export type MatrixCombination = Record<string, string>;
export interface CombinationsGeneratorConstructorParameters {
    matrixKeys: string[];
    matrixValues: string[][];
    log: Logger;
    maxCombinations?: number;
}
export declare class CombinationsGenerator {
    protected readonly _log: Logger;
    protected readonly _matrixKeys: string[];
    protected readonly _matrixValues: string[][];
    protected readonly _maxCombinations: number;
    constructor({ matrixKeys, matrixValues, maxCombinations, log, }: CombinationsGeneratorConstructorParameters);
    generate(): Generator<MatrixCombination>;
    protected _generateRecursively(index: number, combination: Record<string, string>): Generator<MatrixCombination>;
}
//# sourceMappingURL=combinations-generator.d.ts.map