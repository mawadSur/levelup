import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss').ProcessOptions} */
const config = {
  plugins: {
    'postcss-import': {
      // Resolve @levelup/ui/styles to the actual CSS file since postcss-import
      // does not support package.json "exports" subpath resolution.
      resolve(id) {
        if (id === '@levelup/ui/styles') {
          return path.resolve(
            __dirname,
            '../../packages/ui/src/styles/globals.css',
          );
        }
        return id;
      },
    },
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
