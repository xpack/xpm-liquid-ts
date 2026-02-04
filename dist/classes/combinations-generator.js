export class CombinationsGenerator {
    log;
    matrixKeys;
    matrixValues;
    combinations = [];
    constructor({ matrixKeys, matrixValues, log, }) {
        this.log = log;
        this.matrixKeys = matrixKeys;
        this.matrixValues = matrixValues;
        log.trace(`${CombinationsGenerator.name}.constructor: ` +
            `matrixKeys=${JSON.stringify(this.matrixKeys)} ` +
            `matrixValues=${JSON.stringify(this.matrixValues)}`);
    }
    generate() {
        this._generateRecursively(0, {});
        return this.combinations;
    }
    _generateRecursively(index, combination) {
        const log = this.log;
        log.trace(`${CombinationsGenerator.name}.` +
            `_generateRecursively(${String(index)},${JSON.stringify(combination)})`);
        if (index === this.matrixKeys.length) {
            log.trace('combination complete =>', combination);
            this.combinations.push({ ...combination });
            return;
        }
        const key = this.matrixKeys[index];
        const values = this.matrixValues[index];
        for (const value of values) {
            combination[key] = value;
            this._generateRecursively(index + 1, combination);
            delete combination[key];
        }
    }
}
//# sourceMappingURL=combinations-generator.js.map