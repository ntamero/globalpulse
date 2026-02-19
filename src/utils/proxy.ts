import { isDesktopRuntime, toRuntimeUrl } from '../services/runtime';

const isDev = import.meta.env.DEV;

// In production browser deployments, routes are handled by Vercel serverless functions.
// In local dev, Vite proxy handles these routes.
// In Tauri desktop mode, route requests need an absolute remote host.
export function proxyUrl(localPath: string): string {
  if (isDesktopRuntime()) {
    return toRuntimeUrl(localPath);
  }

  if (isDev) {
    return localPath;
  }

  return localPath;
}

export async function fetchWithProxy(url: string): Promise<Response> {
  return fetch(proxyUrl(url));
}
