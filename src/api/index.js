/* ============================================================
   API / INDEX (Adapter Selector & Storage Manager)
   ============================================================ */
import { createRealAdapter } from './gasClient.js';
import { DemoAdapter } from './demoAdapter.js';

let apiUrl = localStorage.getItem('bk_api_url') || '';
let apiToken = localStorage.getItem('bk_api_token') || '';
let isDemo = localStorage.getItem('bk_demo_mode') === '1';

const realAdapter = createRealAdapter(
  () => apiUrl,
  () => apiToken
);

let activeAdapter = isDemo ? DemoAdapter : (apiUrl ? realAdapter : DemoAdapter);

export function getAdapter() {
  return activeAdapter;
}

export function setRealMode(url, token) {
  apiUrl = url;
  apiToken = token;
  isDemo = false;
  localStorage.setItem('bk_api_url', url);
  localStorage.setItem('bk_api_token', token);
  localStorage.removeItem('bk_demo_mode');
  activeAdapter = realAdapter;
}

export function setDemoMode() {
  isDemo = true;
  localStorage.setItem('bk_demo_mode', '1');
  DemoAdapter.seedIfEmpty();
  activeAdapter = DemoAdapter;
}

export function getApiCredentials() {
  return { apiUrl, apiToken, isDemo };
}
