import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { loadCampaign, saveCampaign } from './storage.js';
import { SCORE_MAX, SCORE_MIN, STATUS_LABEL, applyChoice, lootLock, reconcile, statusOf } from './relations.js';

function App() {
  const [data, setData] = useState(loadCampaign);
  const [tab, setTab] = useState('timeline');
  const [active, setActive] = useState(1);
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', date: '2024-07-01', summary: '', tag: '主线' });
  const [selChar, setSelChar] = useState(null);
  const [openFac, setOpenFac] = useState(null);
  const [choiceForm, setChoiceForm] = useState(() => ({
    sessionId: data.sessions[0]?.id,
    factionId: data.factions[0]?.id,
    kind: 'choice',
    delta: 1,
    choice: '',
  }));

  useEffect(() => { saveCampaign(data); }, [data]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const cur = data.sessions.find(x => x.id === active) || data.sessions[0];
  const character = data.characters.find(c => c.name === selChar) || data.characters[0];
  const sessionTitle = id => data.sessions.find(s => s.id === id)?.title || `章节 ${id}`;
  const factionName = id => data.factions.find(f => f.id === id)?.name || id;

  const add = () => {
    if (!form.title) return;
    const s = { ...form, id: Date.now(), color: '#d8a153' };
    setData({ ...data, sessions: [...data.sessions, s] });
    setActive(s.id);
    setForm({ title: '', date: '2024-07-01', summary: '', tag: '主线' });
    setShow(false);
    setNotice('新章节已加入时间线');
  };

  const exportData = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'campaign.json';
    a.click();
    setNotice('战役记录已导出');
  };

  // 记入账本：类型为「态度变化」走 applyChoice，「和解」走 reconcile。
  const recordChoice = () => {
    const choice = choiceForm.choice.trim();
    if (!choice) return;
    const sessionId = Number(choiceForm.sessionId);
    const payload = {
      sessionId,
      choiceId: choice, // 同一章同一抉择（同描述）不重复计分
      choice,
      delta: Number(choiceForm.delta),
      date: data.sessions.find(s => s.id === sessionId)?.date,
    };
    const { character: next, applied } = choiceForm.kind === 'reconcile'
      ? reconcile(character, choiceForm.factionId, payload)
      : applyChoice(character, choiceForm.factionId, payload);
    if (!applied) {
      setNotice(choiceForm.kind === 'reconcile' ? '未和解：关系并非敌对，或该抉择已记录过' : '同一章同一抉择不重复计分');
      return;
    }
    setData({ ...data, characters: data.characters.map(c => (c.name === character.name ? next : c)) });
    setChoiceForm({ ...choiceForm, choice: '' });
    setNotice(choiceForm.kind === 'reconcile' ? '已和解：关系回到中立，历史记录保留' : '抉择已记入关系账本');
  };

  // 发放战利品：敌对锁定时停在锁定状态。
  const distribute = item => {
    if (lootLock(item, data.characters).locked) {
      setNotice('战利品处于锁定状态：存在敌对关系，需先和解');
      return;
    }
    setData({ ...data, loot: data.loot.map(l => (l.id === item.id ? { ...l, status: 'distributed' } : l)) });
    setNotice(`「${item.name}」已发放`);
  };

  // 当前章节里所有角色的关系变化（时间线详情用）。
  const chapterChanges = data.characters.flatMap(c =>
    data.factions.flatMap(f =>
      (c.relations?.[f.id]?.history || [])
        .filter(h => h.sessionId === cur?.id)
        .map(h => ({ char: c.name, faction: f.name, h }))
    )
  );

  return (
    <div className="shell">
      <aside>
        <div className="logo"><span>✦</span> CAMPAIGNER</div>
        <div className="campaign"><small>当前战役</small><strong>{data.name}</strong><span>{data.system} · 2024</span></div>
        <nav>
          {[['timeline', '◌', '时间线'], ['characters', '♙', '角色与阵营'], ['places', '⌖', '地点图鉴'], ['loot', '◇', '战利品']].map(([id, i, t]) => (
            <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><i>{i}</i>{t}</button>
          ))}
        </nav>
        <div className="side-bottom"><button>⚙ 偏好设置</button><small>本地存储已开启</small></div>
      </aside>
      <main>
        <header>
          <div>
            <span className="crumb">MY CAMPAIGN / {data.system}</span>
            <h1>{tab === 'timeline' ? '战役时间线' : tab === 'characters' ? '角色与阵营' : tab === 'places' ? '地点图鉴' : '战利品'}</h1>
          </div>
          <div className="actions">
            <button onClick={exportData} className="outline">↓ 导出</button>
            <button onClick={() => setShow(true)} className="primary">＋ 新建章节</button>
          </div>
        </header>

        {tab === 'timeline' && (
          <div className="timeline-layout">
            <section className="timeline">
              <div className="timeline-intro">
                <div><span>THE CHRONICLE</span><h2>记录每一次冒险</h2></div>
                <span className="count">{data.sessions.length} CHAPTERS</span>
              </div>
              {data.sessions.map((s, i) => (
                <button className={'chapter ' + (active === s.id ? 'selected' : '')} onClick={() => setActive(s.id)} key={s.id}>
                  <div className="date">
                    <b>{new Date(s.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</b>
                    <small>{new Date(s.date).getFullYear()}</small>
                  </div>
                  <div className="line"><span style={{ background: s.color }}></span>{i < data.sessions.length - 1 && <i />}</div>
                  <div className="chapter-copy">
                    <div className="tag">{s.tag}</div>
                    <h3>{s.title}</h3>
                    <p>{s.summary}</p>
                  </div>
                  <span className="arrow">↗</span>
                </button>
              ))}
            </section>
            <section className="detail-panel">
              <div className="detail-cover" style={{ background: cur?.color }}>
                <span>CHAPTER {String(data.sessions.findIndex(x => x.id === active) + 1).padStart(2, '0')}</span><i>✦</i>
              </div>
              <div className="detail-body">
                <span className="tag">{cur?.tag}</span>
                <h2>{cur?.title}</h2>
                <p>{cur?.summary}</p>
                <div className="meta-grid">
                  <div><small>游戏日期</small><strong>{cur?.date}</strong></div>
                  <div><small>参与者</small><strong>{data.characters.length} 位玩家</strong></div>
                </div>
                <div className="chapter-relations">
                  <small>本章关系变化</small>
                  {chapterChanges.length === 0 && <p className="rel-empty">本章还没有态度变化记录。</p>}
                  {chapterChanges.map((x, i) => (
                    <div className="rel-entry" key={i}>
                      <span className={'kind ' + x.h.kind}>{x.h.kind === 'reconcile' ? '和解' : '抉择'}</span>
                      <div><strong>{x.char} → {x.faction}</strong><small>{x.h.choice}</small></div>
                      <b className={x.h.delta >= 0 ? 'up' : 'down'}>{x.h.delta >= 0 ? '+' + x.h.delta : x.h.delta}</b>
                      <small className="from-to">{x.h.from} → {x.h.to}</small>
                    </div>
                  ))}
                </div>
                <div className="note">
                  <span>✎</span>
                  <div><strong>笔记</strong><p>点击编辑这一章节的剧情细节、重要决定和未解线索。</p></div>
                  <button onClick={() => setNotice('笔记编辑已开启')}>编辑</button>
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === 'characters' && (
          <section className="ledger-layout">
            <div className="ledger-side">
              <div className="section-note">队伍中有 {data.characters.length} 位冒险者，选择角色查看关系账本。</div>
              {data.characters.map(c => (
                <button className={'char-card' + (character.name === c.name ? ' selected' : '')} onClick={() => { setSelChar(c.name); setOpenFac(null); }} key={c.name}>
                  <div className="avatar" style={{ background: c.color }}>{c.name[0]}</div>
                  <div><small>{c.role}</small><h3>{c.name}</h3><p>玩家 · {c.player}</p></div>
                  {data.factions.some(f => statusOf(c.relations?.[f.id]?.score ?? 0) === 'hostile') && <span className="hostile-dot">敌对</span>}
                </button>
              ))}
            </div>
            <div className="ledger-main">
              <div className="ledger-head">
                <div><span className="crumb">RELATION LEDGER</span><h2>{character.name} 的关系账本</h2></div>
                <span className="count">态度分 {SCORE_MIN} ~ {SCORE_MAX}</span>
              </div>
              {data.factions.map(f => {
                const rel = character.relations?.[f.id] || { score: 0, history: [] };
                const st = statusOf(rel.score);
                const open = openFac === f.id;
                return (
                  <div className={'rel-row ' + st} key={f.id}>
                    <button className="rel-head" onClick={() => setOpenFac(open ? null : f.id)}>
                      <span className="fac-dot" style={{ background: f.color }} />
                      <strong>{f.name}</strong>
                      <span className="meter"><i style={{ left: ((rel.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100 + '%' }} /></span>
                      <b className="score">{rel.score > 0 ? '+' + rel.score : rel.score}</b>
                      <em className={'status ' + st}>{STATUS_LABEL[st]}</em>
                      {st === 'hostile' && <span className="lock-hint">相关战利品锁定中</span>}
                      <i className="chev">{open ? '▾' : '▸'}</i>
                    </button>
                    {open && (
                      <div className="rel-history">
                        {rel.history.length === 0 && <p className="rel-empty">还没有态度变化记录。</p>}
                        {rel.history.map(h => (
                          <div className="rel-entry" key={h.id}>
                            <span className={'kind ' + h.kind}>{h.kind === 'reconcile' ? '和解' : '抉择'}</span>
                            <div><strong>{h.choice}</strong><small>{sessionTitle(h.sessionId)} · {h.date}</small></div>
                            <b className={h.delta >= 0 ? 'up' : 'down'}>{h.delta >= 0 ? '+' + h.delta : h.delta}</b>
                            <small className="from-to">{h.from} → {h.to}</small>
                          </div>
                        ))}
                        {st === 'hostile' && (
                          <button className="reconcile-btn" onClick={() => setChoiceForm({ ...choiceForm, factionId: f.id, kind: 'reconcile', choice: '和解：交还遗物并致歉' })}>
                            → 发起和解（回到中立）
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="choice-form">
                <span className="crumb">记录抉择 · {character.name}</span>
                <div className="choice-grid">
                  <label>章节
                    <select value={choiceForm.sessionId} onChange={e => setChoiceForm({ ...choiceForm, sessionId: e.target.value })}>
                      {data.sessions.map(s => <option value={s.id} key={s.id}>{s.title}</option>)}
                    </select>
                  </label>
                  <label>阵营
                    <select value={choiceForm.factionId} onChange={e => setChoiceForm({ ...choiceForm, factionId: e.target.value })}>
                      {data.factions.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}
                    </select>
                  </label>
                  <label>类型
                    <select value={choiceForm.kind} onChange={e => setChoiceForm({ ...choiceForm, kind: e.target.value })}>
                      <option value="choice">态度变化</option>
                      <option value="reconcile">和解（回到中立）</option>
                    </select>
                  </label>
                  {choiceForm.kind === 'choice' && (
                    <label>态度分
                      <select value={choiceForm.delta} onChange={e => setChoiceForm({ ...choiceForm, delta: e.target.value })}>
                        {[-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].map(n => <option value={n} key={n}>{n > 0 ? '+' + n : n}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="span">抉择描述
                    <input value={choiceForm.choice} onChange={e => setChoiceForm({ ...choiceForm, choice: e.target.value })} placeholder="例：拒绝交出缴获的徽章" />
                  </label>
                </div>
                <button className="primary full" onClick={recordChoice}>记入账本</button>
                <small className="hint">同一章同一抉择不重复计分；态度分限制在 {SCORE_MIN} 到 {SCORE_MAX}，≤ -3 即敌对。</small>
              </div>
            </div>
          </section>
        )}

        {tab === 'places' && (
          <section className="empty">
            <div>⌖</div>
            <h2>地点图鉴</h2>
            <p>从章节笔记中收集地点。当前已记录灰港、雾林和失落钟楼。</p>
            <div className="place-list">
              <span>01　灰港 <b>已探索</b></span>
              <span>02　失落钟楼 <b>已探索</b></span>
              <span>03　雾林 <b>待探索</b></span>
            </div>
          </section>
        )}

        {tab === 'loot' && (
          <section className="loot-list">
            <div className="section-note">与某阵营敌对时，相关战利品停在锁定状态；和解回到中立后解锁。</div>
            {data.loot.map(item => {
              const lock = lootLock(item, data.characters);
              const done = item.status === 'distributed';
              return (
                <div className={'loot-row' + (lock.locked ? ' locked' : '')} key={item.id}>
                  <div className="loot-info">
                    <strong>{item.name} × {item.count}</strong>
                    <small>{item.type} · 相关阵营：{factionName(item.factionId)}</small>
                  </div>
                  {lock.locked ? (
                    <div className="lock-box">
                      <span className="lock-tag">🔒 锁定</span>
                      {lock.causes.map((c, i) => (
                        <p key={i}>
                          {c.character} 与 {factionName(item.factionId)} 敌对（{c.score}）
                          {c.cause && <>，起因：{sessionTitle(c.cause.sessionId)}「{c.cause.choice}」</>}。需先和解。
                        </p>
                      ))}
                    </div>
                  ) : done ? (
                    <span className="done-tag">已发放</span>
                  ) : (
                    <button className="outline" onClick={() => distribute(item)}>发放</button>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </main>

      {show && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close" onClick={() => setShow(false)}>×</button>
            <span className="crumb">NEW CHAPTER</span>
            <h2>记录新的章节</h2>
            <label>章节标题<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例：第三章：月下集市" /></label>
            <label>游戏日期<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label>章节摘要<textarea rows="3" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="发生了什么？" /></label>
            <label>章节类型
              <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}>
                <option>主线</option><option>支线</option><option>番外</option>
              </select>
            </label>
            <button className="primary full" onClick={add}>保存章节</button>
          </div>
        </div>
      )}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
