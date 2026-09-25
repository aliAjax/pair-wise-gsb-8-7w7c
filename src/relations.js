// 阵营关系计算层：纯逻辑，不依赖 React 与 localStorage。
// 态度分范围 -5 ~ 5；<= -3 视为敌对。
// 关系记录由一条条「变化」组成；和解会写入一个 reconcile 标记，
// 标记之后的记录才计入当前态度，标记之前的历史仍完整保留。

export const SCORE_MIN = -5;
export const SCORE_MAX = 5;
export const HOSTILE_MAX = -3; // 当前分 <= -3 即敌对

export const STATUSES = {
  hostile: { key: 'hostile', label: '敌对', tone: 'bad' },
  neutral: { key: 'neutral', label: '中立', tone: 'muted' },
  friendly: { key: 'friendly', label: '友善', tone: 'good' },
  allied: { key: 'allied', label: '盟友', tone: 'best' },
};

export function clampScore(n) {
  const v = Math.round(Number(n) || 0);
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, v));
}

export function neutralRelation() {
  return { entries: [] };
}

export function getEntries(rel) {
  return Array.isArray(rel?.entries) ? rel.entries : [];
}

// 最近一次和解标记的位置；没有则返回 -1
function lastReconcileIndex(rel) {
  const entries = getEntries(rel);
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].type === 'reconcile') return i;
  }
  return -1;
}

// 计入当前态度的记录（最后一次和解之后）
export function activeEntries(rel) {
  const entries = getEntries(rel);
  return entries.slice(lastReconcileIndex(rel) + 1);
}

// 全部记录（含和解前的历史）
export function allEntries(rel) {
  return getEntries(rel);
}

export function relationScore(rel) {
  return clampScore(
    activeEntries(rel).reduce((sum, e) => sum + (Number(e.delta) || 0), 0)
  );
}

export function scoreStatus(score) {
  if (score <= HOSTILE_MAX) return STATUSES.hostile;
  if (score >= SCORE_MAX) return STATUSES.allied;
  if (score >= 3) return STATUSES.friendly;
  return STATUSES.neutral;
}

export function relationStatus(rel) {
  return scoreStatus(relationScore(rel));
}

export function isHostile(rel) {
  return relationScore(rel) <= HOSTILE_MAX;
}

// 同一章 + 同一抉择（文案去空白）不允许重复计分；和解前的记录也算“已记过”
export function findChange(rel, sessionId, choice) {
  const key = String(choice ?? '').trim();
  return getEntries(rel).find(
    (e) => e.type !== 'reconcile' && e.sessionId === sessionId && String(e.choice ?? '').trim() === key
  );
}

export class DuplicateChoiceError extends Error {
  constructor() {
    super('同一章同一抉择已记录过，不重复计分');
    this.name = 'DuplicateChoiceError';
  }
}

export function addRelationChange(rel, { id, sessionId, choice, delta, at = null }) {
  const text = String(choice ?? '').trim();
  if (!text) throw new Error('请填写触发态度变化的抉择');
  const step = clampScore(delta);
  if (step === 0) throw new Error('态度变化不能为 0');
  if (findChange(rel, sessionId, text)) throw new DuplicateChoiceError();

  const entry = { id, sessionId, choice: text, delta: step, at };
  return { entries: [...getEntries(rel), entry] };
}

// 和解：写入重置标记。当前态度回到中立（0），历史记录不删除。
export function reconcileRelation(rel, { id, sessionId, at = null }) {
  return {
    entries: [...getEntries(rel), { id, sessionId, type: 'reconcile', at }],
  };
}

// 找出当前敌对是被哪条抉择打下去的（和解之后第一次跌破敌对线的变化）
export function hostilityCause(rel) {
  let running = 0;
  for (const e of activeEntries(rel)) {
    if (e.type === 'reconcile' || e.delta == null) continue;
    running = clampScore(running + Number(e.delta));
    if (running <= HOSTILE_MAX) return { entry: e, score: running };
  }
  return null;
}
