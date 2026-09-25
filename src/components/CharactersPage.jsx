import { useState } from 'react';
import { FACTIONS } from '../seed.js';
import {
  addRelationChange,
  DuplicateChoiceError,
  allEntries,
  hostilityCause,
  isHostile,
  reconcileRelation,
  relationScore,
  relationStatus,
} from '../relations.js';
import { uid } from '../util.js';

const today = () => new Date().toISOString().slice(0, 10);
const deltaText = (d) => (d > 0 ? `+${d}` : String(d));

export default function CharactersPage({ data, setData, setNotice }) {
  const [sel, setSel] = useState(data.characters[0]?.name ?? '');
  const ch = data.characters.find((c) => c.name === sel) || data.characters[0];
  const [factionId, setFactionId] = useState(FACTIONS[0].id);
  const [sessionId, setSessionId] = useState(
    data.sessions[data.sessions.length - 1]?.id ?? ''
  );
  const [choice, setChoice] = useState('');
  const [delta, setDelta] = useState(-1);

  const sessionOf = (id) =>
    data.sessions.find((s) => String(s.id) === String(id));

  const updateRelations = (next) =>
    setData({
      ...data,
      characters: data.characters.map((c) =>
        c.name === ch.name ? { ...c, relations: next } : c
      ),
    });

  const submit = () => {
    if (!ch) return;
    if (!sessionId) {
      setNotice('请先在时间线新建一个章节');
      return;
    }
    const rel = ch.relations[factionId];
    try {
      const next = addRelationChange(rel, {
        id: uid(),
        sessionId: Number(sessionId),
        choice,
        delta: Number(delta),
        at: today(),
      });
      const faction = FACTIONS.find((f) => f.id === factionId);
      const updated = { ...ch.relations, [factionId]: next };
      updateRelations(updated);
      setChoice('');
      setNotice(
        `已记录：${ch.name} 对「${faction.name}」态度 ${deltaText(Number(delta))}，当前 ${relationScore(next)}`
      );
    } catch (err) {
      setNotice(err instanceof DuplicateChoiceError ? err.message : err.message);
    }
  };

  const reconcile = () => {
    if (!ch) return;
    const next = {
      ...ch.relations,
      [factionId]: reconcileRelation(ch.relations[factionId], {
        id: uid(),
        sessionId: Number(sessionId),
        at: today(),
      }),
    };
    updateRelations(next);
    const faction = FACTIONS.find((f) => f.id === factionId);
    setNotice(`${ch.name} 与「${faction.name}」和解，当前态度回到中立（历史记录已保留）`);
  };

  if (!ch) {
    return <section className="empty"><h2>暂无角色</h2><p>添加角色后即可维护关系账本。</p></section>;
  }

  return (
    <div className="relation-layout">
      <div className="char-rail">
        <div className="section-note">
          队伍中有 {data.characters.length} 位冒险者，点击查看关系账本。
        </div>
        {data.characters.map((c) => (
          <button
            key={c.name}
            className={'char-rail-card' + (c.name === ch.name ? ' selected' : '')}
            onClick={() => setSel(c.name)}
          >
            <div className="avatar" style={{ background: c.color }}>{c.name[0]}</div>
            <div>
              <small>{c.role}</small>
              <h3>{c.name}</h3>
              <p>玩家 · {c.player}</p>
            </div>
            <span className="rail-status">
              {FACTIONS.map((f) => {
                const s = relationStatus(c.relations[f.id]);
                return <i key={f.id} className={'dot dot-' + s.tone} title={`${f.name} · ${s.label}`} />;
              })}
            </span>
          </button>
        ))}
      </div>

      <section className="ledger-panel">
        <div className="ledger-head">
          <div className="avatar big" style={{ background: ch.color }}>{ch.name[0]}</div>
          <div>
            <small>{ch.role} · 玩家 {ch.player}</small>
            <h2>{ch.name} 的关系账本</h2>
            <p>每章记录一次态度变化；态度分 -5（敌对）到 5（盟友），同一章同一抉择不重复计分。</p>
          </div>
        </div>

        <div className="relation-form">
          <label>章节
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
              {data.sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>
          <label>阵营
            <select value={factionId} onChange={(e) => setFactionId(e.target.value)}>
              {FACTIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label className="grow">触发抉择
            <input
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              placeholder="例：放走了被守卫通缉的走私客"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
          <label>态度变化
            <select value={delta} onChange={(e) => setDelta(e.target.value)}>
              {[-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>{deltaText(v)}</option>
              ))}
            </select>
          </label>
          <button className="primary" onClick={submit}>记下这一抉择</button>
        </div>

        <div className="faction-ledger">
          {FACTIONS.map((f) => {
            const rel = ch.relations[f.id];
            const score = relationScore(rel);
            const status = relationStatus(rel);
            const hostile = isHostile(rel);
            const cause = hostile ? hostilityCause(rel) : null;
            const entries = allEntries(rel);
            return (
              <article key={f.id} className={'faction-block tone-' + status.tone}>
                <div className="faction-head">
                  <div>
                    <h4>{f.name}</h4>
                    <small>{f.note}</small>
                  </div>
                  <div className={'score-badge badge-' + status.tone}>
                    {score} · {status.label}
                  </div>
                </div>
                <div className="score-track">
                  <span className={'fill fill-' + status.tone} style={{ width: `${((score + 5) / 10) * 100}%` }} />
                  <i className="tick" style={{ left: '50%' }} />
                  <i className="tick hostile-tick" style={{ left: '20%' }} title="敌对线 -3" />
                </div>
                {cause && (
                  <div className="hostile-cause">
                    ⛔ 战利品已锁定：
                    {sessionOf(cause.entry.sessionId)?.title || '未知章节'}
                    中抉择「{cause.entry.choice}」使态度跌至 {cause.score}，
                    与该阵营相关的战利品将停在锁定状态。
                  </div>
                )}
                <ul className="entry-list">
                  {entries.length === 0 && (
                    <li className="entry-empty">尚无关系变化记录，当前为中立（0）。</li>
                  )}
                  {[...entries].reverse().map((e) =>
                    e.type === 'reconcile' ? (
                      <li key={e.id} className="entry reconcile">
                        <span className="entry-ico">🕊</span>
                        <div>
                          <strong>和解，态度回到中立</strong>
                          <small>
                            {sessionOf(e.sessionId)?.title || '未知章节'} · {e.at || '日期未记'}
                            ｜此前的变化记录仍保留
                          </small>
                        </div>
                      </li>
                    ) : (
                      <li key={e.id} className="entry">
                        <span className="entry-ico">◆</span>
                        <div>
                          <strong>{e.choice}</strong>
                          <small>
                            {sessionOf(e.sessionId)?.title || '未知章节'} · {e.at || '日期未记'}
                          </small>
                        </div>
                        <span className={'delta delta-' + (e.delta > 0 ? 'up' : 'down')}>
                          {deltaText(e.delta)}
                        </span>
                      </li>
                    )
                  )}
                </ul>
                <div className="faction-foot">
                  <span className="scale-hint">-5 敌对 · 0 中立 · 3 友善 · 5 盟友</span>
                  {hostile && (
                    <button className="outline reconcile-btn" onClick={reconcile}>
                      🕊 和解（回到中立）
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
