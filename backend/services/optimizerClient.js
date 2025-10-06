const axios = require('axios');

const OPTIMIZER_URL = process.env.OPTIMIZER_URL || 'http://127.0.0.1:18080';

const client = axios.create({
  baseURL: OPTIMIZER_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

async function post(path, payload) {
  try {
    const res = await client.post(path, payload);
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const msg = `optimizer POST ${path} failed${status ? ' (' + status + ')' : ''}`;
    const errObj = new Error(msg);
    errObj.status = status || 502;
    errObj.data = data;
    throw errObj;
  }
}

async function get(path, params) {
  try {
    const res = await client.get(path, { params });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const msg = `optimizer GET ${path} failed${status ? ' (' + status + ')' : ''}`;
    const errObj = new Error(msg);
    errObj.status = status || 502;
    errObj.data = data;
    throw errObj;
  }
}

module.exports = {
  solvePickPaths: (payload) => post('/pickpaths/solve', payload),
  solvePickPathsFromSkus: (payload) => post('/pickpaths/solve-from-skus', payload),
  solveAssignments: (payload) => post('/assignments/solve', payload),
  solveSlotting: (payload) => post('/slotting/solve', payload),
  planDockYard: (payload) => post('/dockyard/plan', payload),
  // Generic optimizer ops
  health: () => get('/health'),
  getTasks: (params) => get('/tasks', params),
  acceptTask: (payload) => post('/tasks/accept', payload),
  completeTask: (payload) => post('/tasks/complete', payload),
  syncWorkers: (payload) => post('/workers/sync', payload),
};
