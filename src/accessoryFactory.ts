import { default as SnapcastRemote, Device, Media } from 'snapcast-remote2';
import type { API, Logging, PlatformAccessory, Service, WithUUID } from 'homebridge';
import { CharacteristicInitializer } from './characteristicInitializer';
import { ServiceInitializer } from './serviceInitializer';

export class AccessoryFactory {
    public constructor(
        private readonly logger: Logging,
        private readonly homebridge: API,
        private readonly snapcast: SnapcastRemote,
        private readonly serviceInitializers: ServiceInitializer[],
        private readonly characteristicInitializers: CharacteristicInitializer[],
    ) {}

    public async createAccessories(): Promise<PlatformAccessory[]> {
        return await Promise.all(
            (await this.getDevices())
                .map(device => this.createAccessory(device)),
        );
    }

    private async createAccessory(device: Device): Promise<PlatformAccessory> {
        const media = await this.getMedia(device);
        const accessory = this.newAccessory(device);

        this.serviceInitializers.forEach(serviceInitializer => {
            const serviceType = serviceInitializer.getServiceType(device);

            if (serviceType) {
                const service = this.getService(accessory, serviceType);
                const characteristics = new Set(serviceInitializer.getCharacteristics(device).map(char => char.UUID));

                this.characteristicInitializers
                    .filter(characteristicInitializer => characteristics.has(characteristicInitializer.getCharacteristic().UUID))
                    .forEach(characteristicInitializer => characteristicInitializer.initialize(service, device, media));
            }
        });

        return accessory;
    }

    private getDevices(): Promise<Device[]> {
        return new Promise((resolve, reject) => {
            this.snapcast.getDevices((error, data) => {
                if (error) {
                    return reject(error);
                }

                resolve(data.devices);
            });
        });
    }

    private getMedia(device: Device): Promise<Media> {
        return new Promise((resolve, reject) => {
            this.snapcast.getMedia(device.serialNumber, (error, data) => {
                if (error) {
                    return reject(error);
                }

                resolve(data);
            });
        });
    }

    private newAccessory(device: Device): PlatformAccessory {
        const name = device.accountName;
        const serialNumber = device.serialNumber;
        const uuid = this.homebridge.hap.uuid.generate(serialNumber);
        const category = this.homebridge.hap.Categories.SPEAKER;

        this.logger.debug(`Creating accessory for device: ${JSON.stringify(device)}`);

        return new this.homebridge.platformAccessory(name, uuid, category);
    }

    private getService(accessory: PlatformAccessory, serviceType: WithUUID<typeof Service>): Service {
        let service = accessory.getService(serviceType);

        if (!service) {
            service = accessory.addService(serviceType as unknown as Service);
        }

        return service;
    }
}
