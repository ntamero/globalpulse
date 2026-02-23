/**
 * ArticleOverlay — Inline article viewer
 *
 * Opens news article links in a full-screen overlay with an iframe,
 * using a server-side article-reader proxy to bypass X-Frame-Options.
 * Provides a clean reading experience with close button, escape key support,
 * and fallback link for sites that still can't be displayed.
 *
 * Usage: ArticleOverlay.show(url, title?, source?)
 */

import { escapeHtml } from '@/utils/sanitize';

let overlayInstance: HTMLElement | null = null;

function close(): void {
  if (overlayInstance) {
    overlayInstance.remove();
    overlayInstance = null;
    document.body.style.overflow = '';
  }
  document.removeEventListener('keydown', escHandler);
}

function escHandler(e: KeyboardEvent): void {
  if (e.key === 'Escape') close();
}

export const ArticleOverlay = {
  show(url: string, title?: string, source?: string): void {
    // Close existing overlay if open
    if (overlayInstance) close();

    // Use our server-side article reader proxy to bypass X-Frame-Options
    const params = new URLSearchParams({ url });
    if (title) params.set('title', title);
    if (source) params.set('source', source);
    const proxyUrl = `/api/article-reader?${params.toString()}`;

    const overlay = document.createElement('div');
    overlay.className = 'article-overlay';
    overlay.innerHTML = `
      <div class="article-overlay-backdrop"></div>
      <div class="article-overlay-content">
        <div class="article-overlay-header">
          <div class="article-overlay-info">
            ${source ? `<span class="article-overlay-source">${escapeHtml(source)}</span>` : ''}
            <span class="article-overlay-title">${title ? escapeHtml(title) : escapeHtml(url)}</span>
          </div>
          <div class="article-overlay-actions">
            <a class="article-overlay-external" href="${escapeHtml(url)}" target="_blank" rel="noopener" title="Open in new tab">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                <path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
              </svg>
            </a>
            <button class="article-overlay-close" title="Close (ESC)">&times;</button>
          </div>
        </div>
        <div class="article-overlay-body">
          <div class="article-overlay-loading">
            <div class="article-overlay-spinner"></div>
            <span>Loading article...</span>
          </div>
          <iframe
            class="article-overlay-iframe"
            src="${escapeHtml(proxyUrl)}"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            referrerpolicy="no-referrer"
          ></iframe>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlayInstance = overlay;

    // Iframe load/error handling
    const iframe = overlay.querySelector('.article-overlay-iframe') as HTMLIFrameElement;
    const loading = overlay.querySelector('.article-overlay-loading') as HTMLElement;

    if (iframe) {
      iframe.addEventListener('load', () => {
        if (loading) loading.style.display = 'none';
        iframe.style.opacity = '1';
      });

      // If iframe still loading after timeout, show fallback
      setTimeout(() => {
        if (loading && loading.style.display !== 'none') {
          loading.innerHTML = `
            <div class="article-overlay-fallback">
              <p>This article is taking too long to load.</p>
              <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="article-overlay-fallback-btn">
                Open in New Tab →
              </a>
            </div>
          `;
        }
      }, 12000);
    }

    // Close handlers
    overlay.querySelector('.article-overlay-close')?.addEventListener('click', close);
    overlay.querySelector('.article-overlay-backdrop')?.addEventListener('click', close);
    document.addEventListener('keydown', escHandler);
  },

  close,

  isOpen(): boolean {
    return overlayInstance !== null;
  },
};
