import { OVERLAY_CLOSE_MESSAGE } from '@/lib/overlay';

const HOST_TAG = 'tab-tracker-overlay';
const TOGGLE_EVENT = 'tab-tracker:toggle';

export default defineUnlistedScript(() => {
  const existing = document.querySelector(HOST_TAG);
  if (existing) {
    existing.dispatchEvent(new Event(TOGGLE_EVENT));
    return;
  }

  const host = document.createElement(HOST_TAG);
  const shadow = host.attachShadow({ mode: 'closed' });
  const frame = document.createElement('iframe');
  const style = document.createElement('style');

  style.textContent = `
    iframe {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      border: 0;
      z-index: 2147483647;
      background: transparent;
      color-scheme: light dark;
    }
  `;
  frame.src = browser.runtime.getURL('/dashboard.html');
  frame.allow = 'clipboard-write';
  frame.addEventListener('load', () => frame.focus(), { once: true });

  const controller = new AbortController();
  const { signal } = controller;
  const close = () => {
    controller.abort();
    host.remove();
  };

  host.addEventListener(TOGGLE_EVENT, close, { signal });
  window.addEventListener(
    'message',
    (event) => {
      if (event.source === frame.contentWindow && event.data === OVERLAY_CLOSE_MESSAGE) close();
    },
    { signal },
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') close();
    },
    { signal, capture: true },
  );

  shadow.append(style, frame);
  document.documentElement.append(host);
});
