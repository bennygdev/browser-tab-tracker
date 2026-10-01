export async function ensureAlarm(name: string, info: Browser.alarms.AlarmCreateInfo) {
  if (await browser.alarms.get(name)) return;
  await browser.alarms.create(name, info);
}
