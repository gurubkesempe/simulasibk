/* ============================================================
   API / GAS CLIENT (Google Apps Script Integration)
   ============================================================ */

export async function callGasApi(apiUrl, apiToken, action, payload = {}) {
  const body = JSON.stringify({ action, token: apiToken, ...payload });
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      body: body,
      redirect: 'follow'
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Gagal memproses data di server');
    return json.data;
  } catch (err) {
    // Automatic fallback to GET if POST gets blocked by browser redirects
    if (action === 'getAllBatch' || action === 'getAll') {
      try {
        const sep = apiUrl.includes('?') ? '&' : '?';
        const getUrl = `${apiUrl}${sep}action=${encodeURIComponent(action)}&token=${encodeURIComponent(apiToken)}${payload.type ? `&type=${encodeURIComponent(payload.type)}` : ''}`;
        const resGet = await fetch(getUrl, { redirect: 'follow' });
        const jsonGet = await resGet.json();
        if (jsonGet && jsonGet.ok) return jsonGet.data;
        if (jsonGet && !jsonGet.ok) throw new Error(jsonGet.error || 'Gagal mengambil data');
      } catch (getErr) {
        throw new Error(getErr.message || err.message || 'Gagal menghubungi server Apps Script');
      }
    }
    throw err;
  }
}

export function createRealAdapter(getApiUrl, getApiToken) {
  return {
    async getAll(type) {
      return callGasApi(getApiUrl(), getApiToken(), 'getAll', { type });
    },
    async getAllBatch() {
      return callGasApi(getApiUrl(), getApiToken(), 'getAllBatch');
    },
    async create(type, data) {
      return callGasApi(getApiUrl(), getApiToken(), 'create', { type, data });
    },
    async update(type, id, data) {
      return callGasApi(getApiUrl(), getApiToken(), 'update', { type, id, data });
    },
    async delete(type, id) {
      await callGasApi(getApiUrl(), getApiToken(), 'delete', { type, id });
      return true;
    },
    async importBulk(type, rows, matchField) {
      return callGasApi(getApiUrl(), getApiToken(), 'importBulk', { type, rows, matchField });
    },
    async bulkInsert(type, rows) {
      return callGasApi(getApiUrl(), getApiToken(), 'bulkInsert', { type, rows });
    }
  };
}
