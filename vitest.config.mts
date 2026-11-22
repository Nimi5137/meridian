import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
export default defineConfig({oxc:{jsx:'react-jsx'},resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}}});
