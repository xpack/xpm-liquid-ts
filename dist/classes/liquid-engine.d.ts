import * as liquidjs from 'liquidjs';
import { PlatformDetector } from './platform-detector.js';
export declare class LiquidEngine extends liquidjs.Liquid {
    private readonly platformDetector;
    constructor({ platformDetector, options, }?: {
        platformDetector?: PlatformDetector;
        options?: liquidjs.LiquidOptions;
    });
}
//# sourceMappingURL=liquid-engine.d.ts.map