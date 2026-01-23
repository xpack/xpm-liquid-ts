import semver from 'semver';
export class XpmPolicies {
    minVersion = '0.0.0';
    shareNpmDependencies = false;
    nonHierarchicalLocalXpacksFolder = false;
    onlyStringDependencies = false;
    singleParameterXpmInitTemplate = false;
    constructor({ log, minVersion }) {
        log.trace(`${XpmPolicies.name}({minVersion: ${minVersion})`);
        if (semver.valid(minVersion) === null) {
            return;
        }
        this.minVersion = minVersion;
        this.shareNpmDependencies = semver.lt(this.minVersion, '0.14.0');
        this.nonHierarchicalLocalXpacksFolder = semver.lt(this.minVersion, '0.16.0');
        this.onlyStringDependencies = semver.lt(this.minVersion, '0.16.0');
        this.singleParameterXpmInitTemplate = semver.lt(this.minVersion, '0.22.0');
        log.trace(`policies.shareNpmDependencies: ${String(this.shareNpmDependencies)}`);
    }
}
//# sourceMappingURL=policies.js.map