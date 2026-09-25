// 种子数据 / 迁移版本。旧存档没有 version 时视为 1，会在 storage 层补齐关系。
export const SCHEMA_VERSION = 2;

export const FACTIONS = [
  { id: 'gray-harbor', name: '灰港守卫', note: '驻守灰港的城防势力' },
  { id: 'mist-folk', name: '雾林来客', note: '随海雾出没的流浪法师一族' },
  { id: 'village', name: '深林村民', note: '雾林边缘采药而居的村民' },
];

export const seed = {
  version: SCHEMA_VERSION,
  name: '暮光边境',
  system: 'D&D 5E',
  sessions: [
    {
      id: 1,
      date: '2024-06-08',
      title: '第一章：灰港的钟声',
      summary: '队伍抵达灰港，在失落的钟楼发现了神秘符文。',
      tag: '主线',
      color: '#d8a153',
    },
    {
      id: 2,
      date: '2024-06-15',
      title: '第二章：雾中来客',
      summary: '与流浪法师伊琳结盟，追踪海雾中的脚印。',
      tag: '主线',
      color: '#93b7a6',
    },
    {
      id: 3,
      date: '2024-06-22',
      title: '支线：深林采药',
      summary: '帮助村民寻找月光草，获得一枚古老铜币。',
      tag: '支线',
      color: '#b9a6d1',
    },
  ],
  characters: [
    {
      name: '艾德里安',
      role: '圣骑士',
      player: '林默',
      color: '#d8a153',
      relations: {
        'gray-harbor': {
          entries: [
            { id: 'seed-a1', sessionId: 1, choice: '钟楼符文按守卫要求上交', delta: 1, at: '2024-06-08' },
          ],
        },
        'mist-folk': {
          entries: [
            { id: 'seed-a2', sessionId: 2, choice: '当众质问伊琳的来历', delta: -3, at: '2024-06-15' },
          ],
        },
        village: { entries: [] },
      },
    },
    {
      name: '瑟琳',
      role: '游侠',
      player: '安然',
      color: '#93b7a6',
      relations: {
        'gray-harbor': { entries: [] },
        'mist-folk': {
          entries: [
            { id: 'seed-s1', sessionId: 2, choice: '与伊琳结盟追踪脚印', delta: 2, at: '2024-06-15' },
          ],
        },
        village: {
          entries: [
            { id: 'seed-s2', sessionId: 3, choice: '帮村民找回月光草', delta: 1, at: '2024-06-22' },
          ],
        },
      },
    },
    {
      name: '莫尔',
      role: '术士',
      player: '周岳',
      color: '#b9a6d1',
      relations: {
        'gray-harbor': { entries: [] },
        'mist-folk': { entries: [] },
        village: { entries: [] },
      },
    },
  ],
  loot: [
    {
      id: 'loot-1',
      name: '月光草',
      qty: 3,
      kind: '消耗品',
      factionId: 'village',
      assignedTo: { 瑟琳: 1 },
    },
    { id: 'loot-2', name: '古老铜币', qty: 1, kind: '遗物', factionId: null, assignedTo: {} },
    {
      id: 'loot-3',
      name: '灰港守卫徽章',
      qty: 2,
      kind: '任务物品',
      factionId: 'gray-harbor',
      assignedTo: {},
    },
  ],
};
