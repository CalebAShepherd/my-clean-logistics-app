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

module.exports = {
  solvePickPaths: (payload) => post('/pickpaths/solve', payload),
  solvePickPathsFromSkus: (payload) => post('/pickpaths/solve-from-skus', payload),
  solveAssignments: (payload) => post('/assignments/solve', payload),
  solveSlotting: (payload) => post('/slotting/solve', payload),
  planDockYard: (payload) => post('/dockyard/plan', payload),
};
