import { defineConfig } from 'astro/config';
import { localAuthor } from './tools/local-author.mjs';

export default defineConfig({
  site: 'https://icy-clear-spark.lovable.app',
  build: {
    format: 'file'
  },
  trailingSlash: 'never',
  vite: { plugins: [localAuthor()] }
});
