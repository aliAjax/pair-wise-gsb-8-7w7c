// 本地存档层：只管 localStorage 读写与旧存档迁移，不含任何界面逻辑。
import { FACTIONS, SCHEMA_VERSION, seed } from './seed.js';
import { neutralRelation } from './relations.js';
import { clone } from './util.js';

const KEY = 'campaign-log';

function normalizeRelations(char) {
  const relations =
    char.relations && typeof char.relations === 'object' ? { ...char.relations } : {};
  for (const f of FACTIONS) {
    const rel = relations[f.id];
    // 旧存档角色：补上中立（空记录）；同时修复结构异常的条目
    relations[f.id] =
      rel && Array.isArray(rel.entries)
        ? {
            entries: rel.entries
              .filter((e) => e && (e.type === 'reconcile' || e.choice))
              .map((e) => ({ ...e })),
          }
        : neutralRelation();
  }
  return relations;
}

function migrate(raw) {
  const d = raw && typeof raw === 'object' ? raw : clone(seed);

  d.sessions = Array.isArray(d.sessions) ? d.sessions : [];
  d.characters = Array.isArray(d.characters) ? d.characters : [];
  d.characters = d.characters.map((c) => ({
    ...c,
    // 旧版本（无 version）的角色在此自动补上各阵营中立关系
    relations: normalizeRelations(c),
  }));

  if (!Array.isArray(d.loot)) d.loot = clone(seed.loot);
  d.loot = d.loot.map((l) => ({
    id: l.id,
    name: l.name,
    qty: Number(l.qty) > 0 ? Number(l.qty) : 1,
    kind: l.kind || '杂物',
    factionId: FACTIONS.some((f) => f.id === l.factionId) ? l.factionId : null,
    assignedTo:
      l.assignedTo && typeof l.assignedTo === 'object' ? { ...l.assignedTo } : {},
  }));

  d.version = SCHEMA_VERSION;
  return d;
}

export function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return migrate(raw);
  } catch {
    return clone(seed);
  }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function freshSeed() {
  return clone(seed);
}
