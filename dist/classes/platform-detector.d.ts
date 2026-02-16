export interface PlatformInfo {
    platform: string;
    arch: string;
}
export interface PlatformInfoOptions {
    doForce32bit?: boolean;
}
export declare class PlatformDetector {
    private readonly process;
    constructor(_process?: NodeJS.Process);
    getPlatformInfo(options?: PlatformInfoOptions): PlatformInfo;
    isWindows(): boolean;
}
//# sourceMappingURL=platform-detector.d.ts.map