import semver from 'semver';
export class Policies {
    minVersion = '0.0.0';
    shareNpmDependencies = false;
    nonHierarchicalLocalXpacksFolder = false;
    onlyStringDependencies = false;
    singleParameterXpmInitTemplate = false;
    constructor({ minVersion, log }) {
        log.trace(`${Policies.name}({minVersion: ${minVersion})`);
        if (semver.valid(minVersion) !== null) {
            this.minVersion = minVersion;
            this.shareNpmDependencies = semver.lt(this.minVersion, '0.14.0');
            this.nonHierarchicalLocalXpacksFolder = semver.lt(this.minVersion, '0.16.0');
            this.onlyStringDependencies = semver.lt(this.minVersion, '0.16.0');
            this.singleParameterXpmInitTemplate = semver.lt(this.minVersion, '0.22.0');
        }
        log.trace('policies:', this);
    }
}
//# sourceMappingURL=policies.js.map