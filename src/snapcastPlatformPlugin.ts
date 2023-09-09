import * as fs from 'fs';
import { version as NODE_VERSION } from 'process';
import Ajv from 'ajv';
import type { IndependentPlatformPlugin, Logging, PlatformConfig, API } from 'homebridge';
import SnapcastRemote from 'snapcast-remote2';
import { AccessoryFactory } from './accessoryFactory';
import { SnapcastBridge } from './snapcastBridge';
import { SnapcastPlatformConfig } from './snapcastPlatformConfig';
import {
    CurrentMediaStateInitializer,
    FirmwareRevisionInitializer,
    ManufacturerInitializer,
    ModelInitializer,
    MuteInitializer,
    NameInitializer,
    SerialNumberInitializer,
    TargetMediaStateInitializer,
    VolumeInitializer,
} from './characteristicInitializer';
import {
    AccessoryInfoServiceInitializer,
    SmartSpeakerServiceInitializer,
} from './serviceInitializer';

export class SnapcastPlatformPlugin implements IndependentPlatformPlugin {
    public constructor(logger: Logging, config: PlatformConfig, api: API) {
        const npmPackage = JSON.parse(fs.readFileSync(require.resolve('../package.json'), 'utf8')) as Record<string, unknown>;

        logger.info(`Running ${npmPackage.name as string}-v${npmPackage.version as string} with homebridge-v${api.serverVersion} on node-${NODE_VERSION}.`);

        try {
            if (this.validateConfig(this.getSchema(), config)) {
                const snapcastRemote = new SnapcastRemote();
                const snapcastBridge = new SnapcastBridge(logger, api.hap, snapcastRemote);
                const serviceInitializers = [
                    new AccessoryInfoServiceInitializer(api.hap, config),
                    new SmartSpeakerServiceInitializer(api.hap, config),
                ];
                const characteristicInitializers = [
                    new CurrentMediaStateInitializer(logger, api.hap, snapcastBridge),
                    new TargetMediaStateInitializer(logger, api.hap, snapcastBridge),
                    new MuteInitializer(logger, api.hap, snapcastBridge),
                    new VolumeInitializer(logger, api.hap, snapcastBridge),
                    new ManufacturerInitializer(logger, api.hap, snapcastBridge),
                    new ModelInitializer(logger, api.hap, snapcastBridge),
                    new FirmwareRevisionInitializer(logger, api.hap, snapcastBridge),
                    new NameInitializer(logger, api.hap, snapcastBridge),
                    new SerialNumberInitializer(logger, api.hap, snapcastBridge),
                ];
                const accessoryFactory = new AccessoryFactory(logger, api, snapcastRemote, serviceInitializers, characteristicInitializers);

                // alexaRemote.init(
                //     {
                //         useWsMqtt: true,
                //         amazonPage: config.amazonDomain,
                //         alexaServiceHost: `alexa.${config.amazonDomain}`,
                //         cookie: config.auth?.cookie,
                //         proxyOwnIp: config.auth.proxy.clientHost,
                //         proxyPort: config.auth.proxy.port,
                //         // TODO: Move the remaining entries to config…
                //         amazonPageProxyLanguage: SnapcastPlatformPlugin.PROXY_LANGUAGE,
                //         acceptLanguage: SnapcastPlatformPlugin.SERVICE_LANGUAGE,
                //     },
                //     error => {
                //         if (error) {
                //             logger.error('Failed to initialize.', error);
                //             return;
                //         }

                //         if (!config.auth.cookie && alexaRemote.cookie) {
                //             logger.warn(
                //                 `Alexa cookie retrieved successfully. Save this value in the Homebridge AlexaPlayer configuration as auth.cookie, but never share it with anyone: ${alexaRemote.cookie}`,
                //             );
                //         }

                //         accessoryFactory
                //             .createAccessories()
                //             .then(accessories => {
                //                 api.publishExternalAccessories('homebridge-alexa-player', accessories);
                //             })
                //             .catch(err => {
                //                 logger.error(err);
                //             });
                //     },
                // );
            }
        } catch (e) {
            logger.error(e as any);
        }
    }

    private validateConfig(schema: Record<string, unknown>, config: PlatformConfig): config is SnapcastPlatformConfig {
        const ajv = new Ajv();

        if (ajv.validate<SnapcastPlatformConfig>(schema, config)) {
            return true;
        }

        if (ajv.errors && 0 < ajv.errors.length) {
            const error = ajv.errors[0];
            const message = `Configuration error: config${error.instancePath} ${error.message || ''}`;

            throw new Error(message);
        }

        throw new Error('Unknown configuration error');
    }

    private getSchema(): Record<string, unknown> {
        try {
            const schemaPath = require.resolve('../config.schema.json');
            const file = fs.readFileSync(schemaPath, 'utf8');
            const schema = JSON.parse(file) as Record<string, unknown>;

            return schema.schema as Record<string, unknown>;
        } catch (e: unknown) {
            let message = 'Unable to read/parse configuration schema';

            if (this.hasMessage(e)) {
                message = `${message}: ${e.message}`;
            }

            throw new Error(message);
        }
    }

    private hasMessage(error: unknown): error is { message: string } {
        return 'object' === typeof error && null !== error && 'message' in error;
    }
}
