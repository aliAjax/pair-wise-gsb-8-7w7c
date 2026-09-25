import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { freshSeed, loadData, saveData } from './storage.js';
import CharactersPage from './components/CharactersPage.jsx';
import LootPage from './components/LootPage.jsx';

function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState('timeline');
  const [active, setActive] = useState(1);
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', date: '2024-07-01', summary: '', tag: '主线' });

  useEffect(() => saveData(data), [data]);

  const toastTimer = useRef(null);
  const notify = (msg) => {
    setNotice(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(''), 3600);
  };

  const cur = data.sessions.find((x) => x.id === active) || data.sessions[0];

  const add = () => {
    if (!form.title) return;
    const s = { ...form, id: Date.now(), color: '#d8a153' };
    setData({ ...data, sessions: [...data.sessions, s] });
    setActive(s.id);
    setForm({ title: '', date: '2024-07-01', summary: '', tag: '主线' });
    setShow(false);
    notify('新章节已加入时间线');
  };

  const exportData = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'campaign.json';
    a.click();
    notify('战役记录已导出');
  };

  const nav = [
    ['timeline', '◌', '时间线'],
    ['characters', '♙', '角色与阵营'],
    ['places', '⌖', '地点图鉴'],
    ['loot', '◇', '战利品'],
  ];

  return (
    <div className="shell">
      <aside>
        <div className="logo"><span>✦</span> CAMPAIGNER</div>
        <div className="campaign">
          <small>当前战役</small>
          <strong>{data.name}</strong>
          <span>{data.system} · 2024</span>
        </div>
        <nav>
          {nav.map(([id, i, t]) => (
            <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}>
              <i>{i}</i>{t}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button
            onClick={() => {
              if (confirm('恢复为初始示例数据？当前本地记录会被覆盖。')) {
                setData(freshSeed());
                notify('已恢复初始示例数据');
              }
            }}
          >
            ⚙ 重置示例数据
          </button>
          <small>本地存储已开启</small>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span className="crumb">MY CAMPAIGN / {data.system}</span>
            <h1>
              {tab === 'timeline'
                ? '战役时间线'
                : tab === 'characters'
                ? '角色与阵营 · 关系账本'
                : tab === 'places'
                ? '地点图鉴'
                : '战利品'}
            </h1>
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
                <div>
                  <span>THE CHRONICLE</span>
                  <h2>记录每一次冒险</h2>
                </div>
                <span className="count">{data.sessions.length} CHAPTERS</span>
              </div>
              {data.sessions.map((s, i) => (
                <button
                  className={'chapter ' + (active === s.id ? 'selected' : '')}
                  onClick={() => setActive(s.id)}
                  key={s.id}
                >
                  <div className="date">
                    <b>{new Date(s.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</b>
                    <small>{new Date(s.date).getFullYear()}</small>
                  </div>
                  <div className="line">
                    <span style={{ background: s.color }}></span>
                    {i < data.sessions.length - 1 && <i />}
                  </div>
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
                <span>
                  CHAPTER {String(data.sessions.findIndex((x) => x.id === active) + 1).padStart(2, '0')}
                </span>
                <i>✦</i>
              </div>
              <div className="detail-body">
                <span className="tag">{cur?.tag}</span>
                <h2>{cur?.title}</h2>
                <p>{cur?.summary}</p>
                <div className="meta-grid">
                  <div><small>游戏日期</small><strong>{cur?.date}</strong></div>
                  <div><small>参与者</small><strong>{data.characters.length} 位玩家</strong></div>
                </div>
                <div className="note">
                  <span>✎</span>
                  <div>
                    <strong>笔记</strong>
                    <p>在「角色与阵营」页记录本章各角色的态度变化与触发抉择。</p>
                  </div>
                  <button onClick={() => setTab('characters')}>去记账</button>
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === 'characters' && (
          <CharactersPage data={data} setData={setData} setNotice={notify} />
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

        {tab === 'loot' && <LootPage data={data} setData={setData} setNotice={notify} />}
      </main>

      {show && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close" onClick={() => setShow(false)}>×</button>
            <span className="crumb">NEW CHAPTER</span>
            <h2>记录新的章节</h2>
            <label>章节标题
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：第三章：月下集市" />
            </label>
            <label>游戏日期
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label>章节摘要
              <textarea rows="3" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="发生了什么？" />
            </label>
            <label>章节类型
              <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                <option>主线</option>
                <option>支线</option>
                <option>番外</option>
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
