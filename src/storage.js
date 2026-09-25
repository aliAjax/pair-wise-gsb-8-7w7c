// 本地存档层：负责 localStorage 读写和旧存档迁移，不做关系计算。
import { ensureRelations } from './relations.js';

const KEY = 'campaign-log';

export const seed = {
  name: '暮光边境',
  system: 'D&D 5E',
  sessions: [
    { id: 1, date: '2024-06-08', title: '第一章：灰港的钟声', summary: '队伍抵达灰港，在失落的钟楼发现了神秘符文。', tag: '主线', color: '#d8a153' },
    { id: 2, date: '2024-06-15', title: '第二章：雾中来客', summary: '与流浪法师伊琳结盟，追踪海雾中的脚印。', tag: '主线', color: '#93b7a6' },
    { id: 3, date: '2024-06-22', title: '支线：深林采药', summary: '帮助村民寻找月光草，获得一枚古老铜币。', tag: '支线', color: '#b9a6d1' },
  ],
  factions: [
    { id: 'guard', name: '灰港守卫', color: '#7f9bb3' },
    { id: 'circle', name: '雾林结社', color: '#93b7a6' },
    { id: 'remnant', name: '钟楼遗族', color: '#b9a6d1' },
  ],
  characters: [
    {
      name: '艾德里安', role: '圣骑士', player: '林默', color: '#d8a153',
      relations: {
        guard: { score: 2, history: [
          { id: '1:seal-gate', sessionId: 1, choiceId: 'seal-gate', choice: '协助守卫封锁钟楼', delta: 2, date: '2024-06-08', kind: 'choice', from: 0, to: 2 },
        ] },
        circle: { score: 0, history: [] },
        remnant: { score: 0, history: [] },
      },
    },
    {
      name: '瑟琳', role: '游侠', player: '安然', color: '#93b7a6',
      relations: {
        guard: { score: 0, history: [] },
        circle: { score: -2, history: [
          { id: '3:trample-herbs', sessionId: 3, choiceId: 'trample-herbs', choice: '采药时踩毁月光草田', delta: -2, date: '2024-06-22', kind: 'choice', from: 0, to: -2 },
        ] },
        remnant: { score: 0, history: [] },
      },
    },
    {
      name: '莫尔', role: '术士', player: '周岳', color: '#b9a6d1',
      relations: {
        guard: { score: 0, history: [] },
        circle: { score: 0, history: [] },
        remnant: { score: -4, history: [
          { id: '1:steal-relic', sessionId: 1, choiceId: 'steal-relic', choice: '私吞遗族圣物', delta: -4, date: '2024-06-08', kind: 'choice', from: 0, to: -4 },
        ] },
      },
    },
  ],
  loot: [
    { id: 'herb', name: '月光草', count: 3, type: '消耗品', factionId: 'circle', status: 'stored' },
    { id: 'coin', name: '古老铜币', count: 1, type: '遗物', factionId: 'remnant', status: 'stored' },
    { id: 'badge', name: '灰港守卫徽章', count: 2, type: '任务物品', factionId: 'guard', status: 'stored' },
  ],
};

// 旧存档迁移：缺阵营/战利品补默认，现有角色一律补齐中立关系。
export function migrate(data) {
  const factions = data.factions?.length ? data.factions : seed.factions;
  return {
    ...seed,
    ...data,
    factions,
    loot: data.loot?.length ? data.loot : seed.loot,
    characters: (data.characters || []).map(c => ensureRelations(c, factions)),
  };
}

export function loadCampaign() {
  try {
    const raw = localStorage.getItem(KEY);
    return migrate(raw ? JSON.parse(raw) : seed);
  } catch {
    return migrate(seed);
  }
}

export function saveCampaign(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 存储不可用时静默失败，页面仍可正常使用
  }
}
