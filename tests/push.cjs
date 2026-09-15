const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const handlers = {};
const shown = [];
const opened = [];
const self = {
  addEventListener: (name, fn) => { handlers[name] = fn; },
  registration: { showNotification: async (title, options) => shown.push(options) },
  location: { origin: 'https://checkins.example' },
  clients: { matchAll: async () => [], openWindow: async url => opened.push(url) },
};
vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, URL });
(async () => {
  for (const payload of [null, {}, { url: 'https://evil.example' }, { url: '//evil.example' }]) {
    let pending;
    handlers.push({ data: { json: () => payload }, waitUntil: p => pending = p });
    await pending;
    assert.equal(shown.at(-1).data.url, '/feed');
  }
  const path = '/checkin/12345678-1234-1234-1234-123456789abc';
  let pending;
  handlers.push({ data: { json: () => ({ url: path }) }, waitUntil: p => pending = p });
  await pending;
  assert.equal(shown.at(-1).data.url, path);
  handlers.notificationclick({ notification: { close() {}, data: { url: '//evil.example' } }, waitUntil: p => pending = p });
  await pending;
  assert.equal(opened[0], 'https://checkins.example/feed');
  console.log('6 push payload and navigation assertions passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
