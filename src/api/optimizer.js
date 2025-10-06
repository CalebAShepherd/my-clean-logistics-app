import { getApiBaseUrl } from '../utils/apiHost';

const base = () => `${getApiBaseUrl()}/api`;

export const optimizerApi = {
  solvePickPaths: async (payload) => {
    const res = await fetch(`${base()}/operations/pickpaths/solve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  solvePickPathsFromSkus: async (payload) => {
    const res = await fetch(`${base()}/operations/pickpaths/solve-from-skus`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  solveAssignments: async (payload) => {
    const res = await fetch(`${base()}/operations/assignments/solve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  solveSlotting: async (payload) => {
    const res = await fetch(`${base()}/operations/slotting/solve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  planDockYard: async (payload) => {
    const res = await fetch(`${base()}/operations/dockyard/plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  postChecklistEvent: async (evt) => {
    const res = await fetch(`${base()}/events/checklist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(evt),
    });
    if (!res.ok) throw new Error(await res.text());
  },
};
