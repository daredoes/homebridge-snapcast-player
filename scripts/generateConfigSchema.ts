import * as fs from 'fs';
import * as tjs from 'typescript-json-schema';
import { PLATFORM_NAME } from '../src/snapcastPlatformConfig';

const program = tjs.programFromConfig('tsconfig.json');
const generator = tjs.buildGenerator(program, {
    uniqueNames: true,
    noExtraProps: true,
    required: true,
    strictNullChecks: true,
});

if (!generator) {
    throw new Error('Failed to build schema generator.');
}

const configSymbolName = 'SnapcastPlatformConfig';
const configSymbol = generator.getSymbols(configSymbolName).find(symbol => 0 < symbol.fullyQualifiedName.indexOf('src/snapcastPlatformConfig'));

if (!configSymbol) {
    throw new Error(`Failed to find ${configSymbolName} symbol.`);
}

const schema = {
    pluginAlias: PLATFORM_NAME,
    pluginType: 'platform',
    singular: true,
    schema: generator.getSchemaForSymbol(configSymbol.name),
    layout: [
        {
            type: 'fieldset',
            expandable: false,
            title: 'Authentication',
            items: [
                {
                    key: 'auth.host',
                    title: 'Snapcast Host',
                    placeholder: 'e.g., 192.168.1.234, snapcast.local, localhost',
                    description: 'A current IP address or hostname of the snapcast host that is accessible from the homebridge server.',
                },
                {
                    key: 'auth.port',
                    title: 'Proxy Port',
                    placeholder: 'e.g., 2345',
                    description: 'The port the snapcast WS API runs on.',
                },
                {
                    key: 'auth.ssl',
                    title: 'SSL',
                    description: 'Use https for the connection?',
                },
            ],
        },
    ],
};

fs.writeFileSync('config.schema.json', JSON.stringify(schema));
