// 关系计算：纯函数层，不碰存储和页面。
// 态度分范围 -5 ~ 5；≤ -3 视为敌对；同一章同一抉择不重复计分。

export const SCORE_MIN = -5;
export const SCORE_MAX = 5;
export const HOSTILE_AT = -3;

export const STATUS_LABEL = { allied: '盟友', friendly: '友善', neutral: '中立', hostile: '敌对' };

export const clampScore = n => Math.max(SCORE_MIN, Math.min(SCORE_MAX, n));

export function statusOf(score) {
  if (score <= HOSTILE_AT) return 'hostile';
  if (score >= 3) return 'allied';
  if (score >= 1) return 'friendly';
  return 'neutral';
}

export const neutralRelation = () => ({ score: 0, history: [] });

// 旧存档迁移：给角色补齐所有阵营的关系，缺的补中立，已有的保留历史。
export function ensureRelations(character, factions) {
  const relations = { ...(character.relations || {}) };
  for (const f of factions) {
    const rel = relations[f.id];
    relations[f.id] = rel
      ? { score: clampScore(rel.score ?? 0), history: rel.history || [] }
      : neutralRelation();
  }
  return { ...character, relations };
}

const alreadyRecorded = (rel, sessionId, choiceId) =>
  rel.history.some(h => h.sessionId === sessionId && h.choiceId === choiceId);

// 记一次抉择：同一章同一抉择（sessionId + choiceId）不重复计分。
export function applyChoice(character, factionId, { sessionId, choiceId, choice, delta, date }) {
  const rel = character.relations?.[factionId] || neutralRelation();
  if (alreadyRecorded(rel, sessionId, choiceId)) return { character, applied: false };
  const from = rel.score;
  const to = clampScore(from + delta);
  const entry = { id: `${sessionId}:${choiceId}`, sessionId, choiceId, choice, delta, date, kind: 'choice', from, to };
  const relations = { ...character.relations, [factionId]: { score: to, history: [...rel.history, entry] } };
  return { character: { ...character, relations }, applied: true, entry };
}

// 和解：仅从敌对回到中立（0 分），此前的变化记录全部保留。
export function reconcile(character, factionId, { sessionId, choiceId, choice, date }) {
  const rel = character.relations?.[factionId] || neutralRelation();
  if (statusOf(rel.score) !== 'hostile') return { character, applied: false };
  if (alreadyRecorded(rel, sessionId, choiceId)) return { character, applied: false };
  const entry = { id: `${sessionId}:${choiceId}`, sessionId, choiceId, choice, delta: -rel.score, date, kind: 'reconcile', from: rel.score, to: 0 };
  const relations = { ...character.relations, [factionId]: { score: 0, history: [...rel.history, entry] } };
  return { character: { ...character, relations }, applied: true, entry };
}

// 找出最近一次把关系推进敌对的那次抉择（用于锁定时指认起因）。
export function hostileCause(character, factionId) {
  const rel = character.relations?.[factionId];
  if (!rel) return null;
  for (let i = rel.history.length - 1; i >= 0; i--) {
    const h = rel.history[i];
    if (h.kind === 'choice' && h.to <= HOSTILE_AT && h.from > HOSTILE_AT) return h;
  }
  return null;
}

// 战利品锁定：任一角色与该战利品相关阵营敌对即锁定，并给出造成敌对的抉择。
export function lootLock(item, characters) {
  const causes = [];
  for (const c of characters) {
    const rel = c.relations?.[item.factionId];
    if (rel && statusOf(rel.score) === 'hostile') {
      causes.push({ character: c.name, score: rel.score, cause: hostileCause(c, item.factionId) });
    }
  }
  return { locked: causes.length > 0, causes };
}
