export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const clone = (v) => JSON.parse(JSON.stringify(v));
