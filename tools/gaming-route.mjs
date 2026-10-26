import { readFile } from 'node:fs/promises';
// Astro dev does not resolve public-directory indexes. Static hosts do.
export function gamingRoute() {
  const middleware = server => () => { server.middlewares.stack.unshift({ route: '', handle: (request, response, next) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/gaming') {
      response.writeHead(302, { Location: '/gaming/' + url.search });
      response.end();
      return;
    }
    if (url.pathname === '/gaming/') {
      readFile(new URL('../public/gaming/index.html', import.meta.url)).then(html => {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
      }).catch(next);
      return;
    }
    next();
  } }); };
  // Run after Astro installs its global trailingSlash:'never' guard. Exempt only this static sub-app.
  return { name: 'gaming-static-index', enforce: 'post', configureServer: middleware, configurePreviewServer: middleware };
}