export async function openDashboard(tab: Browser.tabs.Tab) {
  const injected = tab.id !== undefined && (await injectOverlay(tab.id));
  if (!injected) await openStandaloneDashboard();
}

export async function openStandaloneDashboard(snapshotId?: number) {
  const page = browser.runtime.getURL('/dashboard.html');
  await browser.windows.create({
    url: snapshotId === undefined ? page : `${page}?snapshot=${snapshotId}`,
    type: 'popup',
    width: 1100,
    height: 760,
  });
}

async function injectOverlay(tabId: number): Promise<boolean> {
  try {
    await browser.scripting.executeScript({ target: { tabId }, files: ['/overlay.js'] });
    return true;
  } catch {
    return false;
  }
}
