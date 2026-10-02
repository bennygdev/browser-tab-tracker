import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const { name, version } = JSON.parse(readFileSync('package.json', 'utf8'));
const { WEB_EXT_API_KEY: apiKey, WEB_EXT_API_SECRET: apiSecret } = process.env;

export default {
  sourceDir: '.output/firefox-mv3',
  sign: {
    channel: 'unlisted',
    uploadSourceCode: `.output/${name}-${version}-sources.zip`,
    ...(apiKey && apiSecret && { apiKey, apiSecret }),
  },
};
