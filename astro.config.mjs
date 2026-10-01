import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://icy-clear-spark.lovable.app',
  build: {
    format: 'file'
  },
  trailingSlash: 'never'
});
