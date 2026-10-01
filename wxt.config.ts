import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifestVersion: 3,
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
  },
  manifest: ({ browser }) => ({
    name: 'Tab Tracker',
    incognito: 'spanning',
    permissions: [
      'activeTab',
      'alarms',
      'downloads',
      'notifications',
      'scripting',
      'storage',
      'tabs',
      'unlimitedStorage',
    ],
    action: {
      default_title: 'Tab Tracker',
    },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+H' },
      },
    },
    web_accessible_resources: [
      {
        resources: ['dashboard.html'],
        matches: ['<all_urls>'],
      },
    ],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: '{95139869-c4e3-4175-bd4d-3119645f5b84}',
          strict_min_version: '140.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
      },
    }),
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
