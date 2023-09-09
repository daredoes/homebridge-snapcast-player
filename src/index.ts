import type { API, PluginInitializer } from 'homebridge';
import { PLATFORM_NAME } from './snapcastPlatformConfig';
import { SnapcastPlatformPlugin } from './snapcastPlatformPlugin';

const init: PluginInitializer = (api: API): void => {
    api.registerPlatform(PLATFORM_NAME, SnapcastPlatformPlugin);
};

export default init;
