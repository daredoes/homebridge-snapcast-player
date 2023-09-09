import type { PlatformConfig } from 'homebridge';

export const PLATFORM_NAME = 'SnapcastPlayer';

export interface SnapcastPlatformConfig extends PlatformConfig {
    platform: typeof PLATFORM_NAME;
    auth: {
        ssl?: boolean;
        host: string;
        port: number;
    };
}
