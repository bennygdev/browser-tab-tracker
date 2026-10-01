export async function openDashboard(tab: Browser.tabs.Tab) {
  const injected = tab.id !== undefined && (await injectOverlay(tab.id));
  if (!injected) await openStandaloneDashboard();
}

async function injectOverlay(tabId: number): Promise<boolean> {
  try {
    await browser.scripting.executeScript({ target: { tabId }, files: ['/overlay.js'] });
    return true;
  } catch {
    return false;
  }
}

async function openStandaloneDashboard() {
  await browser.windows.create({
    url: browser.runtime.getURL('/dashboard.html'),
    type: 'popup',
    width: 960,
    height: 720,
  });
}
