import { useState } from 'react';
import { FACTIONS } from '../seed.js';
import { hostilityCause, isHostile, relationScore } from '../relations.js';
import { uid } from '../util.js';

const KINDS = ['武器', '防具', '消耗品', '遗物', '任务物品', '杂物'];

export default function LootPage({ data, setData, setNotice }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', qty: 1, kind: '杂物', factionId: '' });

  const factionOf = (id) => FACTIONS.find((f) => f.id === id);
  const sessionOf = (id) =>
    data.sessions.find((s) => String(s.id) === String(id));
  const charOf = (name) => data.characters.find((c) => c.name === name);

  const assignedTotal = (item) =>
    Object.values(item.assignedTo).reduce((a, b) => a + (Number(b) || 0), 0);

  const patchLoot = (next) => setData({ ...data, loot: next });

  // 该角色是否被这件战利品锁定；锁定时返回造成敌对的抉择
  const lockFor = (item, name) => {
    if (!item.factionId) return null;
    const c = charOf(name);
    if (!c) return null;
    const rel = c.relations[item.factionId];
    return isHostile(rel) ? hostilityCause(rel) : null;
  };

  const assign = (item, name) => {
    const cause = lockFor(item, name);
    if (cause) {
      const f = factionOf(item.factionId);
      setNotice(
        `⛔ 已锁定：${name} 与「${f.name}」敌对（${sessionOf(cause.entry.sessionId)?.title || '未知章节'}「${cause.entry.choice}」），不能发放 ${item.name}`
      );
      return;
    }
    if (assignedTotal(item) >= item.qty) {
      setNotice(`${item.name} 已全部分完`);
      return;
    }
    patchLoot(
      data.loot.map((l) =>
        l.id === item.id
          ? {
              ...l,
              assignedTo: {
                ...l.assignedTo,
                [name]: (Number(l.assignedTo[name]) || 0) + 1,
              },
            }
          : l
      )
    );
    setNotice(`${item.name} × 1 已发给 ${name}`);
  };

  const unassign = (item, name) => {
    const cur = Number(item.assignedTo[name]) || 0;
    const rest = cur > 1 ? { [name]: cur - 1 } : (() => {
      const next = { ...item.assignedTo };
      delete next[name];
      return next;
    })();
    patchLoot(
      data.loot.map((l) => (l.id === item.id ? { ...l, assignedTo: rest } : l))
    );
  };

  const addLoot = () => {
    const name = form.name.trim();
    if (!name) return;
    patchLoot([
      ...data.loot,
      {
        id: uid(),
        name,
        qty: Number(form.qty) > 0 ? Number(form.qty) : 1,
        kind: form.kind,
        factionId: form.factionId || null,
        assignedTo: {},
      },
    ]);
    setForm({ name: '', qty: 1, kind: '杂物', factionId: '' });
    setShowAdd(false);
    setNotice(`战利品「${name}」已入库`);
  };

  return (
    <section className="loot-page">
      <div className="loot-top">
        <p className="section-note">
          带有阵营的战利品只会发给与该阵营非敌对的角色；态度跌到 -3 后自动锁定，直到和解。
        </p>
        <button className="primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '收起' : '＋ 登记战利品'}
        </button>
      </div>

      {showAdd && (
        <div className="loot-form">
          <label>名称
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例：银纹匕首" />
          </label>
          <label>数量
            <input type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          </label>
          <label>类型
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </label>
          <label>关联阵营
            <select value={form.factionId} onChange={(e) => setForm({ ...form, factionId: e.target.value })}>
              <option value="">（无，任何角色可领）</option>
              {FACTIONS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <button className="primary" onClick={addLoot}>入库</button>
        </div>
      )}

      <div className="loot-grid">
        {data.loot.map((item) => {
          const f = factionOf(item.factionId);
          const given = assignedTotal(item);
          return (
            <article key={item.id} className="loot-card">
              <div className="loot-card-head">
                <div className="loot-glyph">◇</div>
                <div>
                  <h3>{item.name} <b className="qty">× {item.qty}</b></h3>
                  <small>{item.kind}</small>
                </div>
                {f ? (
                  <span className="faction-tag" title={`关联阵营：${f.name}`}>{f.name}</span>
                ) : (
                  <span className="faction-tag none">通用</span>
                )}
              </div>

              <div className="loot-holds">
                <span className="holds-label">已发放 {given}/{item.qty}</span>
                {Object.keys(item.assignedTo).length === 0 && <small>尚未发放</small>}
                {Object.entries(item.assignedTo).map(([name, n]) => (
                  <span key={name} className="hold-chip">
                    {name} × {n}
                    <button title="收回一件" onClick={() => unassign(item, name)}>×</button>
                  </span>
                ))}
              </div>

              <div className="loot-assign">
                <small>发放给：</small>
                {data.characters.map((c) => {
                  const cause = lockFor(item, c.name);
                  const full = given >= item.qty;
                  return (
                    <div key={c.name} className={'assign-row' + (cause ? ' locked' : '')}>
                      <span className="who">{c.name}</span>
                      {f && (
                        <span className={'mini-score ' + (cause ? 'bad' : 'ok')}>
                          {f.name} {relationScore(c.relations[f.id])}
                        </span>
                      )}
                      {cause ? (
                        <span className="lock-tag" title={`${sessionOf(cause.entry.sessionId)?.title || '未知章节'}：${cause.entry.choice}`}>
                          ⛔ 锁定 · {sessionOf(cause.entry.sessionId)?.title?.replace(/^.*：/, '') || '未知章节'}「{cause.entry.choice}」
                        </span>
                      ) : (
                        <button
                          className="outline assign-btn"
                          disabled={full}
                          onClick={() => assign(item, c.name)}
                        >
                          ＋ 发放
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
