import { default as SnapcastRemote, CommandEvent, Device, DopplerCommandEvent } from 'snapcast-remote2';
import type { Characteristic, CharacteristicSetCallback, CharacteristicValue, HAP, Logging, Service, WithUUID } from 'homebridge';

interface SnapcastListener {
    device: Device;
    callback: (command: DopplerCommandEvent) => void;
}

export class SnapcastBridge {
    private readonly listeners: Array<SnapcastListener> = [];

    public constructor(private readonly logger: Logging, private readonly hap: HAP, private readonly snapcastRemote: SnapcastRemote) {}

    public onCharacteristicSet(
        device: Device,
        service: Service,
        characteristic: WithUUID<new () => Characteristic>,
        getCommand: ((value: CharacteristicValue) => string) | string,
        getCommandValue?: ((value: CharacteristicValue) => unknown) | string | number | Record<string, unknown> | undefined,
    ): void {
        service
            .getCharacteristic(characteristic)
            .on(this.hap.CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
                try {
                    const command = 'function' === typeof getCommand ? getCommand(value) : getCommand;
                    const commandValue = 'function' === typeof getCommandValue ? getCommandValue(value) : getCommandValue;

                    // this.alexaRemote.sendCommand(device.serialNumber, command, commandValue, e => {
                    //     if (e) {
                    //         const message = `Failed to send ${command} to set ${characteristic.name} to ${JSON.stringify(commandValue)}.`;
                    //         this.logger.error(message, e);
                    //         return callback(new Error(message));
                    //     }

                    //     return callback(undefined);
                    // });
                } catch (e) {
                    this.logger.error(`Uncaught error on setting ${characteristic.name}: ${JSON.stringify(e)}`);
                    callback(e as any);
                }
            });
    }

    public onDeviceCommand(device: Device, listener: (command: DopplerCommandEvent) => void): void {
        if (0 === this.listeners.length) {
            // this.alexaRemote.on('command', command => this.onCommand(command));
        }

        this.listeners.push({
            device,
            callback: listener,
        });
    }

    private onCommand(command: CommandEvent): void {
        if (this.isDopplerCommand(command)) {
            this.listeners
                .filter(listener => listener.device.serialNumber === command.payload.dopplerId.deviceSerialNumber)
                .forEach(listener => listener.callback(command));
        }
    }

    private isDopplerCommand(command: CommandEvent): command is DopplerCommandEvent {
        return 'dopplerId' in command.payload;
    }
}
