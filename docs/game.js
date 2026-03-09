'use strict';
// ===== 文字モンスター育成RPG - Web版 (グラフィック版) =====

// ===== 定数 =====
const ELEM_JP = {
  fire:'火', water:'水', thunder:'雷', ice:'氷',
  earth:'土', wind:'風', light:'光', dark:'闇', neutral:'無',
};
const ELEM_CLASS = {
  fire:'elem-fire', water:'elem-water', thunder:'elem-thunder', ice:'elem-ice',
  earth:'elem-earth', wind:'elem-wind', light:'elem-light', dark:'elem-dark', neutral:'elem-neutral',
};
const ELEM_ADV = {
  fire:    ['wind','ice'],
  water:   ['fire','thunder'],
  thunder: ['water','wind'],
  ice:     ['earth','wind'],
  earth:   ['thunder','light'],
  wind:    ['earth','dark'],
  light:   ['dark'],
  dark:    ['light'],
};
const RARITY_ORDER   = { N:1, R:2, SR:3, SSR:4 };
const RARITY_RECRUIT = { N:1.2, R:1.0, SR:0.7, SSR:0.4 };
const RARITY_LIST    = ['N','R','SR','SSR'];
const RARITY_ICON    = { N: '·', R: '◆', SR: '★', SSR: '✦' };
const ROLE_ICON = {
  attack:'⚔', defense:'🛡', speed:'💨', debuff:'☠', heal:'💊', utility:'◉',
};
const ROLE_JP = {
  attack:'攻撃', defense:'防御', speed:'速度', debuff:'弱体', heal:'回復', utility:'汎用',
};
const ELEM_ICON      = {
  fire:'🔥', water:'💧', thunder:'⚡', ice:'❄',
  earth:'🪨', wind:'🌀', light:'✨', dark:'🌑', neutral:'○',
};
const POS_W = [
  {hp:1.0, atk:1.5, def_:1.0, spd:0.8},
  {hp:1.2, atk:0.8, def_:1.5, spd:1.0},
  {hp:1.0, atk:1.0, def_:0.8, spd:1.5},
];
const BATTLE_MAX = 3;
const SLOTS      = 3;
const SEP        = '─'.repeat(28);
const SAVE_PFX   = 'kanji_rpg_slot_';

// ボタンアイコン・タイプマッピング
const BTN_META = {
  'ぼうけん':             { icon: '⚔', cls: 'type-action' },
  'たたかう':             { icon: '⚔', cls: 'type-attack' },
  'たたかう！':           { icon: '⚔', cls: 'type-attack' },
  'にげる':               { icon: '↩', cls: 'type-flee'   },
  'なかま':               { icon: '♟', cls: 'type-info'   },
  'ずかん':               { icon: '◉', cls: 'type-info'   },
  'ぼうけんのしょ':       { icon: '◈', cls: 'type-info'   },
  'はい':                 { icon: '✓', cls: 'type-ok'     },
  'はい！':               { icon: '✓', cls: 'type-ok'     },
  'する！':               { icon: '✓', cls: 'type-ok'     },
  'つかう！':             { icon: '✦', cls: 'type-ok'     },
  'はじめから':           { icon: '▶', cls: 'type-action' },
  'ぼうけんのしょをよむ': { icon: '◇', cls: 'type-info'  },
  'なかまにする？はい！': { icon: '✓', cls: 'type-ok'     },
  'いいえ':               { icon: '✗', cls: 'type-cancel' },
  'みおくる':             { icon: '✗', cls: 'type-cancel' },
  'もどる':               { icon: '←', cls: 'type-back'   },
  'やめる':               { icon: '←', cls: 'type-back'   },
  'やめた':               { icon: '←', cls: 'type-back'   },
  '終了':                 { icon: '←', cls: 'type-back'   },
  'きろくする':           { icon: '◆', cls: 'type-info'   },
  'よみなおす':           { icon: '◇', cls: 'type-info'   },
  'さいきんのたたかい':   { icon: '◎', cls: 'type-info'   },
  '解禁文字リスト':       { icon: '◉', cls: 'type-info'   },
  'ひらめきマップ':       { icon: '✦', cls: 'type-info'   },
  'メンバーへんこう':     { icon: '↕', cls: 'type-info'   },
  'くわしくみる':         { icon: '◎', cls: 'type-info'   },
  '配合する':             { icon: '⊕', cls: 'type-action' },
  '続きを見る':           { icon: '▼', cls: 'type-info'   },
  'パーティに くわえる':  { icon: '+', cls: 'type-ok'     },
  'パーティから はずす':  { icon: '−', cls: 'type-cancel' },
  '⚔こうげき':           { icon: '⚔', cls: 'type-attack'  },
  '✨まほう':             { icon: '✨', cls: 'type-magic'   },
  '💊かいふく':           { icon: '💊', cls: 'type-heal'    },
  '🛡まもり':             { icon: '🛡', cls: 'type-guard'   },
  '☠じゅもん':           { icon: '☠', cls: 'type-debuff'  },
  '💨れんげき':           { icon: '💨', cls: 'type-swift'   },
  '◉きあい':             { icon: '◉', cls: 'type-boost'   },
};

// ===== スキル定義 =====
const SKILL_DEFS = {
  attack: { id: 'attack', name: 'こうげき', icon: '⚔' },
  magic:  { id: 'magic',  name: 'まほう',   icon: '✨' },
  heal:   { id: 'heal',   name: 'かいふく', icon: '💊' },
  guard:  { id: 'guard',  name: 'まもり',   icon: '🛡' },
  debuff: { id: 'debuff', name: 'じゅもん', icon: '☠' },
  swift:  { id: 'swift',  name: 'れんげき', icon: '💨' },
  boost:  { id: 'boost',  name: 'きあい',   icon: '◉' },
};
const ROLE_SKILL = {
  attack:  'magic',
  defense: 'guard',
  speed:   'swift',
  debuff:  'debuff',
  heal:    'heal',
  utility: 'boost',
};

function getSkills(monster) {
  const skills = [SKILL_DEFS.attack];
  const seen   = new Set(['attack']);
  for (const ch of monster.chars) {
    const sid = ROLE_SKILL[ch.role];
    if (sid && !seen.has(sid)) {
      seen.add(sid);
      skills.push(SKILL_DEFS[sid]);
    }
  }
  return skills;
}

// ===== ユーティリティ =====
const randInt  = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const randF    = (lo, hi) => lo + Math.random() * (hi - lo);
const pickRnd  = arr => arr[Math.floor(Math.random() * arr.length)];

function sampleN(arr, n) {
  const a = [...arr];
  const r = [];
  for (let i = 0; i < n && a.length; i++) {
    const j = Math.floor(Math.random() * a.length);
    r.push(a.splice(j, 1)[0]);
  }
  return r;
}

function weightedPick(items, weights) {
  let total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function rarityWeights(totalLv) {
  if (totalLv <=  3) return [95,  5,  0,  0];
  if (totalLv <=  8) return [80, 18,  2,  0];
  if (totalLv <= 15) return [65, 28,  6,  1];
  if (totalLv <= 25) return [45, 35, 16,  4];
  if (totalLv <= 40) return [30, 35, 25, 10];
  return                    [20, 30, 35, 15];
}

function elemMult(ae, de) {
  if ((ELEM_ADV[ae] || []).includes(de)) return 1.5;
  if ((ELEM_ADV[de] || []).includes(ae)) return 0.7;
  return 1.0;
}

// ===== ゲームデータ =====
const G = {
  allChars:      {},
  inspMap:       {},
  unlocked:      {},
  monsters:      [],
  battleParty:   [],
  battleLog:     [],
  autoSaveSlot:  0,   // 自動セーブ先スロット（0=未選択、手動セーブ/ロード時に更新）
};

function initData() {
  for (const ch of KANJI_DATA) G.allChars[ch.char] = ch;
  for (const [key, out] of Object.entries(INSP_MAP)) G.inspMap[key] = out;
}

const leader   = () => G.battleParty[0] || null;
const totalLv  = () => G.battleParty.reduce((s, m) => s + m.level, 0) || 1;
const unlock   = chars => { for (const ch of chars) G.unlocked[ch.char] = ch; };

// ===== Monster クラス =====
class Monster {
  constructor(d = {}) {
    this.name            = d.name || '???';
    this.chars           = d.chars || [];
    this.level           = d.level || 1;
    this.exp             = d.exp || 0;
    this.currentHp       = d.currentHp || 0;
    this.maxHp           = d.maxHp || 0;
    this.atk             = d.atk || 0;
    this.def_            = d.def_ || 0;
    this.spd             = d.spd || 0;
    this.parents         = d.parents || [];
    this.grandparents    = d.grandparents || [];
    this.inspirationUsed = d.inspirationUsed || false;
  }

  calc() {
    let hp = 0, atk = 0, def_ = 0, spd = 0;
    for (let i = 0; i < this.chars.length; i++) {
      const ch = this.chars[i];
      const w  = POS_W[Math.min(i, 2)];
      hp   += ch.hp  * w.hp;
      atk  += ch.atk * w.atk;
      def_ += ch.def * w.def_;
      spd  += ch.spd * w.spd;
    }
    const sc = 1 + (this.level - 1) * 0.12;
    this.maxHp = Math.max(5,  Math.floor(hp   * sc) + this.level * 3);
    this.atk   = Math.max(1,  Math.floor(atk  * sc) + this.level);
    this.def_  = Math.max(1,  Math.floor(def_ * sc) + this.level);
    this.spd   = Math.max(1,  Math.floor(spd  * sc) + this.level);
    this.currentHp = this.maxHp;
  }

  heal(amount = null) {
    this.currentHp = amount === null
      ? this.maxHp
      : Math.min(this.maxHp, this.currentHp + amount);
  }

  elem() {
    if (!this.chars.length) return 'neutral';
    const cnt = {};
    let best = 'neutral', bestN = 0;
    for (const c of this.chars) {
      cnt[c.element] = (cnt[c.element] || 0) + 1;
      if (cnt[c.element] > bestN) { bestN = cnt[c.element]; best = c.element; }
    }
    return best;
  }

  rarity() {
    if (!this.chars.length) return 'N';
    return this.chars.reduce(
      (b, c) => (RARITY_ORDER[c.rarity] || 0) > (RARITY_ORDER[b] || 0) ? c.rarity : b, 'N');
  }

  expNeed() { return this.level * 12; }

  gainExp(amount) {
    const msgs = [];
    this.exp += amount;
    while (this.exp >= this.expNeed()) {
      this.exp -= this.expNeed();
      this.level++;
      const oldMax = this.maxHp;
      this.calc();
      this.currentHp = Math.min(this.currentHp + (this.maxHp - oldMax), this.maxHp);
      msgs.push(`  ${this.name} は レベル ${this.level} に あがった！`);
    }
    return msgs;
  }

  fullStatus() {
    const ej = ELEM_JP[this.elem()] || '?';
    const lines = [
      `  名前    : ${this.name}`,
      `  レベル  : ${this.level}  (EXP ${this.exp}/${this.expNeed()})`,
      `  属性    : ${ej}`,
      `  レア度  : ${this.rarity()}`,
      `  HP      : ${this.currentHp}/${this.maxHp}`,
      `  こうげき: ${this.atk}`,
      `  ぼうぎょ: ${this.def_}`,
      `  すばやさ: ${this.spd}`,
    ];
    if (this.parents.length)      lines.push(`  親     : ${this.parents.join(' / ')}`);
    if (this.grandparents.length) lines.push(`  祖父母 : ${this.grandparents.join(' / ')}`);
    lines.push('  ─ 構成文字 ─');
    const posLbl = ['1文字目（攻撃）','2文字目（防御）','3文字目（速度）'];
    for (let i = 0; i < this.chars.length; i++) {
      const ch = this.chars[i];
      lines.push(`    [${ch.char}] ${posLbl[i] || ''} ${ELEM_JP[ch.element] || '?'}属性/${ch.rarity}`);
    }
    return lines;
  }

  toDict() {
    return {
      name: this.name, chars: this.chars,
      level: this.level, exp: this.exp,
      currentHp: this.currentHp, maxHp: this.maxHp,
      atk: this.atk, def_: this.def_, spd: this.spd,
      parents: this.parents, grandparents: this.grandparents,
      inspirationUsed: this.inspirationUsed,
    };
  }

  static fromDict(d) { return new Monster(d); }
}

// ===== ひらめきチェック =====
function checkInsp(monster) {
  if (monster.inspirationUsed || monster.level < 20) return null;
  const chars = monster.chars.map(c => c.char);
  const lookup = subset => G.inspMap[[...subset].sort().join('|')] || null;
  let r = lookup(chars);
  if (r) return r;
  if (chars.length === 3) {
    for (const [i, j] of [[0,1],[0,2],[1,2]]) {
      r = lookup([chars[i], chars[j]]);
      if (r) return r;
    }
  }
  return null;
}

// ===== セーブ / ロード =====
function saveGame(slot) {
  const bpIdx = G.battleParty.map(m => G.monsters.indexOf(m));
  const data = {
    savedAt: new Date().toLocaleString('ja-JP'),
    unlocked: G.unlocked,
    monsters: G.monsters.map(m => m.toDict()),
    battlePartyIndices: bpIdx,
  };
  localStorage.setItem(SAVE_PFX + slot, JSON.stringify(data));
}

function autoSave() {
  if (!G.autoSaveSlot) return;  // ぼうけんのしょ未選択なら何もしない
  saveGame(G.autoSaveSlot);
  const ind = document.createElement('div');
  ind.className = 'screen-line dim';
  ind.style.fontSize = '10px';
  ind.textContent = `  ◆ S${G.autoSaveSlot} じどうきろく`;
  $text().appendChild(ind);
  $text().scrollTop = $text().scrollHeight;
}

function loadGame(slot) {
  const raw = localStorage.getItem(SAVE_PFX + slot);
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    G.unlocked     = d.unlocked || {};
    G.monsters     = (d.monsters || []).map(Monster.fromDict);
    G.battleParty  = (d.battlePartyIndices || []).map(i => G.monsters[i]).filter(Boolean);
    return true;
  } catch(e) { return false; }
}

function slotInfo(slot) {
  const raw = localStorage.getItem(SAVE_PFX + slot);
  if (!raw) return '(空)';
  try {
    const d = JSON.parse(raw);
    const li = d.battlePartyIndices[0];
    const lead = d.monsters[li];
    return `${lead.name} Lv${lead.level}  ${d.monsters.length}体  ${d.savedAt}`;
  } catch(e) { return '(読み込みエラー)'; }
}

// ===================================================
// ===== UI エンジン =====
// ===================================================
const ui = {
  inputResolver: null,
  inputType: null,  // 'menu'|'pause'|'pick'
  menuChoices: [],
  tapHandler: null,
};

const $gfx  = () => document.getElementById('screen-graphics');
const $text = () => document.getElementById('screen-text');
const $btns = () => document.getElementById('btn-container');

// ---------- テキスト出力 ----------
function print(text = '', cls = '') {
  const div = document.createElement('div');
  div.className = 'screen-line' + (cls ? ' ' + cls : '');
  div.textContent = text;
  $text().appendChild(div);
  $text().scrollTop = $text().scrollHeight;
}

function clearScreen() {
  $text().innerHTML = '';
  $btns().innerHTML = '';
  hideGraphics();
}

function printSep()    { print(SEP, 'separator'); }
function printHeader() {
  print('文字モンスター育成RPG', 'bright');
  print(SEP, 'separator');
}

// ---------- バトルログ表示ヘルパー ----------
// d = { type, isParty, atkName, atkElem, tgtName, tgtElem, dmg, adv, healAmt, hit, guarded, debuffStacks }
function printBattleAction(d) {
  const line = document.createElement('div');
  line.className = 'b-line';

  // 攻撃者バッジ
  line.appendChild(makeNameBadge(d.atkName, d.atkElem, d.isParty ? 'party' : 'enemy'));

  // スキルラベル（通常攻撃以外）
  if (d.type && d.type !== 'attack') {
    const sk = SKILL_DEFS[d.type];
    if (sk) {
      const skSpan = document.createElement('span');
      skSpan.className = `b-skill b-skill-${d.type}`;
      skSpan.textContent = sk.icon + sk.name;
      line.appendChild(skSpan);
    }
  }

  // 矢印
  const arr = document.createElement('span');
  arr.className = 'b-arr';
  arr.textContent = '→';
  line.appendChild(arr);

  // 対象バッジ
  line.appendChild(makeNameBadge(d.tgtName, d.tgtElem, d.isParty ? 'enemy' : 'party'));

  if (d.type === 'heal') {
    // かいふく：緑数値
    const healSpan = document.createElement('span');
    healSpan.className = 'b-dmg b-heal';
    healSpan.textContent = `+${d.healAmt}`;
    const lbl = document.createElement('span');
    lbl.className = 'b-lbl';
    lbl.textContent = 'かいふく';
    line.appendChild(healSpan);
    line.appendChild(lbl);
  } else {
    // ダメージ系
    const dmgSpan = document.createElement('span');
    dmgSpan.className = `b-dmg ${d.isParty ? 'b-dmg-p' : 'b-dmg-e'}`;
    dmgSpan.textContent = d.dmg;
    const lbl = document.createElement('span');
    lbl.className = 'b-lbl';
    lbl.textContent = d.type === 'swift' ? `${d.hit}hit` : 'ダメージ';
    line.appendChild(dmgSpan);
    line.appendChild(lbl);

    if (d.adv) {
      const advSpan = document.createElement('span');
      advSpan.className = 'b-adv';
      advSpan.textContent = '★ゆうり';
      line.appendChild(advSpan);
    }
    if (d.type === 'debuff') {
      const dbSpan = document.createElement('span');
      dbSpan.className = 'b-debuff-tag';
      dbSpan.textContent = `☠こうげき-${Math.min(d.debuffStacks, 3) * 20}%`;
      line.appendChild(dbSpan);
    }
    if (d.guarded) {
      const gSpan = document.createElement('span');
      gSpan.className = 'b-guard-tag';
      gSpan.textContent = '🛡まもり中';
      line.appendChild(gSpan);
    }
  }

  $text().appendChild(line);
  $text().scrollTop = $text().scrollHeight;
}

function printBattleHp(name, elem, curHp, maxHp, isKo) {
  const row = document.createElement('div');
  row.className = 'b-hp-row';

  const nameSpan = document.createElement('span');
  nameSpan.className = `b-hp-name ${ELEM_CLASS[elem] || ''}`;
  nameSpan.textContent = name;

  const bar = document.createElement('div');
  bar.className = 'b-hp-bar';
  const pct = maxHp > 0 ? Math.max(0, curHp / maxHp) : 0;
  const fill = document.createElement('div');
  const hpCls = pct <= 0.2 ? ' hp-crit' : pct <= 0.5 ? ' hp-low' : pct <= 0.7 ? ' hp-mid' : '';
  fill.className = 'b-hp-fill' + hpCls;
  fill.style.width = `${Math.round(pct * 100)}%`;
  bar.appendChild(fill);

  const numSpan = document.createElement('span');
  numSpan.className = 'b-hp-num';
  numSpan.textContent = `${curHp}/${maxHp}`;

  row.appendChild(nameSpan);
  row.appendChild(bar);
  row.appendChild(numSpan);

  if (isKo) {
    const ko = document.createElement('span');
    ko.className = 'b-ko';
    ko.textContent = 'KO';
    row.appendChild(ko);
  }

  $text().appendChild(row);
  $text().scrollTop = $text().scrollHeight;
}

function makeNameBadge(name, elem, side = '') {
  const sp = document.createElement('span');
  const sideCls = side === 'party' ? ' b-name-p' : side === 'enemy' ? ' b-name-e' : '';
  sp.className = `b-name ${ELEM_CLASS[elem] || ''}${sideCls}`;
  sp.textContent = `${ELEM_ICON[elem] || ''} ${name}`;
  return sp;
}

function printRich(cls, ...parts) {
  const div = document.createElement('div');
  div.className = 'screen-line' + (cls ? ' ' + cls : '');
  for (const p of parts) {
    div.appendChild(p instanceof Node ? p : document.createTextNode(String(p)));
  }
  $text().appendChild(div);
  $text().scrollTop = $text().scrollHeight;
}

// ---------- グラフィックエリア ----------
function hideGraphics() {
  const g = $gfx();
  g.innerHTML = '';
  g.className = 'hidden';
}

// ソロカード（メインメニュー・ステータス等）
function showSingleCard(monster, hp) {
  const g = $gfx();
  g.innerHTML = '';
  g.className = 'solo-mode';
  g.appendChild(makeMonsterCard(monster, hp, 'solo'));
}

// バトルグラフィック（味方:左 VS 敵:右）
function showBattleGraphics(enemy, eHp, partyHps) {
  const g = $gfx();
  g.innerHTML = '';
  g.className = 'battle-mode';

  // ─── 味方側（左）───
  const leftDiv = document.createElement('div');
  leftDiv.className = 'battle-left';
  const cnt = G.battleParty.length;
  const kanjiPx = cnt === 1 ? 38 : cnt === 2 ? 28 : 20;

  for (let i = 0; i < cnt; i++) {
    const hp   = Array.isArray(partyHps) ? partyHps[i] : G.battleParty[i].currentHp;
    const card = makeMonsterCard(G.battleParty[i], hp, 'party');
    const kj   = card.querySelector('.card-kanji');
    if (kj) kj.style.fontSize = kanjiPx + 'px';
    if (Array.isArray(partyHps) && partyHps[i] <= 0) card.classList.add('ko');
    leftDiv.appendChild(card);
  }
  g.appendChild(leftDiv);

  // ─── 中央 VS ───
  const center = document.createElement('div');
  center.className = 'battle-center';
  const divLine = document.createElement('div');
  divLine.className = 'battle-center-line';
  center.appendChild(divLine);
  const vs = document.createElement('div');
  vs.className = 'vs-label';
  vs.textContent = 'VS';
  center.appendChild(vs);
  g.appendChild(center);

  // ─── 敵側（右）───
  const rightDiv = document.createElement('div');
  rightDiv.className = 'battle-right';
  rightDiv.appendChild(makeMonsterCard(enemy, eHp, 'enemy'));
  g.appendChild(rightDiv);
}

// タイトル画面グラフィック
function showTitleGraphic() {
  const g = $gfx();
  g.innerHTML = '';
  g.className = 'title-mode';

  const wrap = document.createElement('div');
  wrap.className = 'title-graphic';

  // ゲームタイトル
  const titleText = document.createElement('div');
  titleText.className = 'title-text';
  titleText.textContent = '文字モンスター';
  wrap.appendChild(titleText);

  const rpgLabel = document.createElement('div');
  rpgLabel.className = 'title-rpg-label';
  rpgLabel.textContent = '育　成　Ｒ　Ｐ　Ｇ';
  wrap.appendChild(rpgLabel);

  // サンプルモンスター（R〜SSRからランダム3体）
  const sample = sampleN(Object.values(G.allChars).filter(c => c.rarity !== 'N'), 3);
  const row = document.createElement('div');
  row.className = 'title-kanji-row';
  for (const ch of sample) {
    const item = document.createElement('div');
    item.className = `title-kanji-item ${ELEM_CLASS[ch.element] || 'elem-neutral'}`;
    item.textContent = ch.char;
    row.appendChild(item);
  }
  wrap.appendChild(row);

  const sub = document.createElement('div');
  sub.className = 'title-sub';
  sub.textContent = '文字に力が宿る';
  wrap.appendChild(sub);

  g.appendChild(wrap);
}

// 冒険トラベル画面グラフィック
function showTravelGraphics() {
  const g = $gfx();
  g.innerHTML = '';
  g.className = 'travel-mode';

  const row = document.createElement('div');
  row.className = 'travel-party-row';
  for (const m of G.battleParty) {
    const mini = document.createElement('div');
    mini.className = `travel-mini ${ELEM_CLASS[m.elem()] || 'elem-neutral'}`;
    mini.textContent = m.name;
    row.appendChild(mini);
  }
  g.appendChild(row);

  const arrow = document.createElement('div');
  arrow.className = 'travel-arrow';
  arrow.textContent = '▶　▶　▶';
  g.appendChild(arrow);
}

// モンスターカード生成
// variant: 'enemy' | 'party' | 'solo'
function makeMonsterCard(monster, hp, variant) {
  const rar   = monster.rarity();
  const elem  = monster.elem();
  const curHp = (hp !== undefined && hp !== null) ? hp : monster.currentHp;
  const maxHp = monster.maxHp;

  const card = document.createElement('div');
  if (variant === 'enemy') {
    card.className = `monster-card enemy-card rarity-${rar}`;
  } else if (variant === 'party') {
    card.className = `monster-card party-card rarity-${rar}`;
  } else {
    card.className = `monster-card solo-card rarity-${rar}`;
  }

  // サイドラベル（バトルカードはLvも表示）
  const sideLabel = variant === 'enemy'  ? `てき  Lv${monster.level}`
                  : variant === 'party'  ? `みかた Lv${monster.level}`
                  : '';
  if (sideLabel) {
    const sl = document.createElement('div');
    sl.className = 'card-side-label';
    sl.textContent = sideLabel;
    card.appendChild(sl);
  }

  // レア度バッジ（アイコン）
  const badge = document.createElement('div');
  badge.className = 'card-badge';
  badge.textContent = RARITY_ICON[rar] || rar;
  card.appendChild(badge);

  // 属性アイコン
  const elemDiv = document.createElement('div');
  elemDiv.className = 'card-elem';
  elemDiv.textContent = ELEM_ICON[elem] || ELEM_JP[elem] || '?';
  card.appendChild(elemDiv);

  // 大カンジ
  const kanjiDiv = document.createElement('div');
  const len = [...monster.name].length;
  const lenCls = len === 1 ? '' : len === 2 ? 'len2' : 'len3';
  kanjiDiv.className = `card-kanji ${lenCls} ${ELEM_CLASS[elem] || 'elem-neutral'}`;
  kanjiDiv.textContent = monster.name;
  card.appendChild(kanjiDiv);

  // HP バー
  const hpWrap = document.createElement('div');
  hpWrap.className = 'card-hp-wrap';
  const hpLabel = document.createElement('div');
  hpLabel.className = 'card-hp-label';
  hpLabel.innerHTML = `<span>HP</span><span>${curHp}/${maxHp}</span>`;
  hpWrap.appendChild(hpLabel);
  const hpBar = document.createElement('div');
  hpBar.className = 'card-hp-bar';
  const hpFill = document.createElement('div');
  const ratio = maxHp > 0 ? Math.max(0, Math.min(1, curHp / maxHp)) : 0;
  const pct   = Math.round(ratio * 100);
  const fillCls = ratio <= 0.15 ? 'hp-crit' : ratio <= 0.35 ? 'hp-low' : ratio <= 0.65 ? 'hp-mid' : '';
  hpFill.className = `card-hp-fill ${fillCls}`;
  hpFill.style.width = pct + '%';
  hpBar.appendChild(hpFill);
  hpWrap.appendChild(hpBar);
  card.appendChild(hpWrap);

  // ソロ表示のときだけ下部にLvを表示（バトルはサイドラベルに記載済み）
  if (variant === 'solo') {
    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = `Lv${monster.level}`;
    card.appendChild(nameDiv);
  }

  return card;
}

// ---------- ボタン出力 (メイン) ----------
function menu(title, choices) {
  return new Promise(resolve => {
    ui.inputType     = 'menu';
    ui.menuChoices   = choices;
    ui.inputResolver = resolve;

    const bc = $btns();
    bc.innerHTML = '';

    if (title) {
      const t = document.createElement('div');
      t.className = 'screen-line mid';
      t.style.marginBottom = '3px';
      t.textContent = title;
      bc.appendChild(t);
    }

    // グリッドレイアウト自動判定
    const grid = document.createElement('div');
    const n = choices.length;
    let cols = 'cols-1';
    if (n === 2) cols = 'cols-2';
    else if (n === 3) cols = 'cols-2-1';
    else if (n === 4) cols = 'cols-2';
    grid.className = `action-grid ${cols}`;

    choices.forEach((c, i) => {
      const meta = BTN_META[c.trim()];
      const btn  = document.createElement('button');
      btn.className = 'action-btn' + (meta ? ' ' + meta.cls : '');
      if (meta?.icon) {
        const icon = document.createElement('span');
        icon.className = 'btn-icon';
        icon.textContent = meta.icon;
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(c));
      } else {
        btn.textContent = c;
      }
      btn.onclick = () => resolveMenu(i);
      grid.appendChild(btn);
    });
    bc.appendChild(grid);
  });
}

function resolveMenu(idx) {
  if (ui.inputType !== 'menu' || !ui.inputResolver) return;
  const fn = ui.inputResolver;
  ui.inputType = null; ui.inputResolver = null; ui.menuChoices = [];
  $btns().innerHTML = '';
  fn(idx);
}

// ---------- 一時停止（タップで続行） ----------
function pause() {
  return new Promise(resolve => {
    ui.inputType     = 'pause';
    ui.inputResolver = resolve;

    $btns().innerHTML = '';

    // ▶▶▶ インジケーターをテキストエリアに追加
    const ind = document.createElement('div');
    ind.className = 'screen-line tap-indicator';
    ind.textContent = '  ▶ ▶ ▶';
    $text().appendChild(ind);
    $text().scrollTop = $text().scrollHeight;

    // 50ms 遅延でタップイベント登録（直前のクリックが誤発火しないよう）
    setTimeout(() => {
      if (ui.inputType !== 'pause') return;
      const scr = document.getElementById('screen');
      function onTap() {
        scr.removeEventListener('click', onTap);
        ui.tapHandler = null;
        resolvePause();
      }
      ui.tapHandler = onTap;
      scr.addEventListener('click', onTap);
    }, 50);
  });
}

function resolvePause() {
  if (ui.inputType !== 'pause' || !ui.inputResolver) return;
  const fn = ui.inputResolver;
  ui.inputType = null; ui.inputResolver = null;
  $btns().innerHTML = '';
  if (ui.tapHandler) {
    document.getElementById('screen').removeEventListener('click', ui.tapHandler);
    ui.tapHandler = null;
  }
  fn();
}

// ---------- キーボードショートカット ----------
document.addEventListener('keydown', e => {
  if (ui.inputType === 'pause') {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); resolvePause(); }
    return;
  }
  if (ui.inputType === 'menu') {
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key) - 1;
      if (idx < ui.menuChoices.length) resolveMenu(idx);
    } else if (e.key === 'Enter') {
      resolveMenu(0);
    }
    return;
  }
});


// ===================================================
// ===== 文字タイルピッカー =====
// ===================================================
async function pickChars(prompt, pool, maxLen = 3) {
  return new Promise(resolve => {
    const chosen = [];

    function render() {
      const bc = $btns();
      bc.innerHTML = '';
      hideGraphics();

      // --- 選択済みスロット＋プロンプト ---
      const wrap = document.createElement('div');
      wrap.id = 'char-picker-wrap';

      // 選択済み表示行
      const selRow = document.createElement('div');
      selRow.className = 'char-selected-row';

      const selLabel = document.createElement('div');
      selLabel.className = 'char-selected-label';
      selLabel.textContent = `名前(${chosen.length}/${maxLen})：`;
      selRow.appendChild(selLabel);

      for (let i = 0; i < maxLen; i++) {
        const slot = document.createElement('div');
        slot.className = 'char-selected-slot' + (chosen[i] ? ' filled' : '');
        slot.textContent = chosen[i] ? chosen[i].char : '＿';
        if (chosen[i]) {
          const idx = i;
          slot.title = '取り消す';
          slot.onclick = () => {
            chosen.splice(idx, 1);
            render();
          };
        }
        selRow.appendChild(slot);
      }
      wrap.appendChild(selRow);

      // --- タイルグリッド ---
      const tileScroll = document.createElement('div');
      tileScroll.className = 'char-tile-scroll';
      const tileGrid = document.createElement('div');
      tileGrid.className = 'char-tile-grid';

      pool.forEach((ch, idx) => {
        const isChosen = chosen.includes(ch);
        const tile = document.createElement('div');
        tile.className = 'char-tile' + (isChosen ? ' selected' : '');

        const num = document.createElement('div');
        num.className = 'tile-num';
        num.textContent = idx + 1;

        const kanji = document.createElement('div');
        kanji.className = `tile-kanji ${ELEM_CLASS[ch.element] || ''}`;
        kanji.textContent = ch.char;

        const info = document.createElement('div');
        info.className = 'tile-info';
        info.textContent = `${ELEM_JP[ch.element] || '?'}/${ch.rarity}`;

        tile.appendChild(num);
        tile.appendChild(kanji);
        tile.appendChild(info);

        if (!isChosen && chosen.length < maxLen) {
          tile.onclick = () => {
            chosen.push(ch);
            render();
          };
        }
        tileGrid.appendChild(tile);
      });

      tileScroll.appendChild(tileGrid);
      wrap.appendChild(tileScroll);

      // --- 確定 / やりなおし ボタン ---
      const actionRow = document.createElement('div');
      actionRow.className = 'picker-action-row';

      const okBtn = document.createElement('button');
      okBtn.className = 'action-btn';
      okBtn.textContent = chosen.length > 0 ? `「${chosen.map(c=>c.char).join('')}」で決定` : '(1文字以上選ぶ)';
      okBtn.disabled = chosen.length === 0;
      if (chosen.length > 0) {
        okBtn.onclick = () => {
          $btns().innerHTML = '';
          resolve(chosen);
        };
      } else {
        okBtn.style.opacity = '0.5';
        okBtn.style.cursor = 'default';
      }

      const resetBtn = document.createElement('button');
      resetBtn.className = 'action-btn pause-btn';
      resetBtn.textContent = 'やりなおし';
      resetBtn.onclick = () => {
        chosen.length = 0;
        render();
      };

      actionRow.appendChild(okBtn);
      actionRow.appendChild(resetBtn);
      wrap.appendChild(actionRow);
      bc.appendChild(wrap);
    }

    // テキストエリアにプロンプト表示
    $text().innerHTML = '';
    print();
    print(`  ★ ${prompt}`);
    print(`  文字をタップして選択（最大${maxLen}文字）`);
    print();

    render();
  });
}

// ===================================================
// ===== ゲーム開始 =====
// ===================================================
async function gameStart() {
  clearScreen();
  showTitleGraphic();
  print();
  print('  文字には力が宿る。', 'bright');
  print('  カンジの力を持つモンスターを育て、');
  print('  世界を旅しよう。');
  print();

  if (slotInfo(1) !== '(空)') {
    // S1 にセーブあり → 自動ロード
    print(`  ◆ ${slotInfo(1)}`, 'dim');
    print();
    await pause();
    loadGame(1);
    G.autoSaveSlot = 1;
  } else {
    // セーブなし → 新規スタート
    await pause();
    createStarter();
  }
  mainLoop();
}

function createStarter() {
  const rChars = Object.values(G.allChars).filter(c => c.rarity === 'R');
  const chosen = sampleN(rChars, 2);
  unlock(chosen);
  const m = new Monster({ name: chosen.map(c=>c.char).join(''), chars: chosen });
  m.calc();
  G.monsters.push(m);
  G.battleParty.push(m);
}

// ===================================================
// ===== メインループ =====
// ===================================================
async function mainLoop() {
  while (true) {
    clearScreen();
    const m = leader();
    showSingleCard(m, m.currentHp);
    print();
    printRich('bright', '  ▶ ', makeNameBadge(m.name, m.elem(), 'party'), `  [${m.rarity()}]  Lv${m.level}`);
    print(`    HP: ${m.currentHp}/${m.maxHp}  ATK:${m.atk} DEF:${m.def_} SPD:${m.spd}`);
    print(`  なかま: ${G.battleParty.length}/${BATTLE_MAX}体  所持: ${G.monsters.length}体`);
    print();

    const idx = await menu('コマンド', ['ぼうけん', 'なかま', 'ずかん', 'ぼうけんのしょ']);
    if      (idx === 0) await explore();
    else if (idx === 1) await partyMenu();
    else if (idx === 2) await zukan();
    else if (idx === 3) await bookMenu();
  }
}

// ===================================================
// ===== 探索 =====
// ===================================================
const EXPLORE_MSGS = [
  'ぼうけんに でかけた……',
  'あらたな ちへ むかった……',
  'みちなき みちを すすんだ……',
  'てきを もとめて あるきだした……',
  'せかいの はてを めざした……',
];
async function explore() {
  clearScreen();
  showTravelGraphics();
  const names = G.battleParty.map(m => m.name).join('　');
  const msg   = EXPLORE_MSGS[Math.floor(Math.random() * EXPLORE_MSGS.length)];
  print();
  print(`  ${names} たちは ${msg}`, 'bright');
  print();
  await pause();

  const enemy = makeWildEnemy();
  const rar   = enemy.rarity();

  clearScreen();
  showBattleGraphics(enemy, enemy.currentHp, G.battleParty.map(m => m.currentHp));
  print();
  printRich('bright', '  やせいの ', makeNameBadge(enemy.name, enemy.elem(), 'enemy'), ' が あらわれた！');
  print(`  [${rar}]  ${ELEM_JP[enemy.elem()] || '?'}属性  Lv${enemy.level}`);
  print();

  const idx = await menu('どうする？', ['たたかう', 'にげる']);
  if (idx === 1) {
    print();
    print('  うまく にげられた！');
    await pause();
    return;
  }
  await doBattle(enemy);
}

function makeWildEnemy() {
  const total = totalLv();
  const size  = G.battleParty.length || 1;
  const wts   = rarityWeights(total);
  const rar   = weightedPick(RARITY_LIST, wts);
  let pool    = Object.values(G.allChars).filter(c => c.rarity === rar);
  if (!pool.length) pool = Object.values(G.allChars);

  const n      = weightedPick([1,2,3], [2,4,4]);
  const chosen = sampleN(pool, Math.min(n, pool.length));
  const avgLv  = total / size;
  const sm     = 1 + 0.1 * (size - 1);
  const lv     = Math.max(1, Math.floor(avgLv * sm * randF(0.85, 1.15)));

  const e = new Monster({ name: chosen.map(c=>c.char).join(''), chars: chosen, level: lv });
  e.calc();

  const RMULT = { N:0.80, R:1.00, SR:1.15, SSR:1.35 };
  const rm = RMULT[rar] || 1.0;
  if (rm !== 1.0) {
    e.atk  = Math.max(1, Math.floor(e.atk  * rm));
    e.def_ = Math.max(1, Math.floor(e.def_ * rm));
    e.spd  = Math.max(1, Math.floor(e.spd  * rm));
  }
  return e;
}

// ===================================================
// ===== バトル =====
// ===================================================
async function doBattle(enemy) {
  const partyHp          = G.battleParty.map(m => m.currentHp);
  let eHp                = enemy.maxHp;
  let turns              = 0;
  let flawless           = true;
  let elemAdv            = false;
  let enemyDebuffStacks  = 0;   // じゅもん蓄積（最大3）：-20%/stack、永続
  const log              = [];

  function refreshBattleGraphics() {
    showBattleGraphics(enemy, eHp, partyHp);
  }

  function showBattleStatus() {
    clearScreen();
    refreshBattleGraphics();
    print();
    print(`  ─ ターン ${turns + 1} ─`, 'mid');
    if (enemyDebuffStacks > 0) {
      print(`  ☠ てき こうげき -${enemyDebuffStacks * 20}%`, 'dim');
    }
    print();
    for (let i = 0; i < G.battleParty.length; i++) {
      const m  = G.battleParty[i];
      const arrow = i === 0 ? '▶ ' : '   ';
      const parts = [`  ${arrow}`, makeNameBadge(m.name, m.elem(), 'party'), `  Lv${m.level}`];
      if (partyHp[i] <= 0) {
        const ko = document.createElement('span');
        ko.className = 'b-ko';
        ko.textContent = 'KO';
        parts.push('  ', ko);
      }
      printRich('', ...parts);
    }
  }

  // ── AIによる自動スキル選択 ──
  function pickAutoSkill(leaderIdx) {
    const leader = G.battleParty[leaderIdx];
    const skills = getSkills(leader);
    // 優先1: HP35%以下のメンバーがいれば回復
    const heal = skills.find(s => s.id === 'heal');
    if (heal && G.battleParty.some((m, i) => partyHp[i] > 0 && partyHp[i] / m.maxHp < 0.35)) return heal;
    // 優先2: リーダーHP45%以下ならまもり（35%確率）
    const guard = skills.find(s => s.id === 'guard');
    if (guard && partyHp[leaderIdx] / leader.maxHp < 0.45 && Math.random() < 0.35) return guard;
    // 優先3: じゅもんスタック3未満なら弱体（25%確率）
    const debuff = skills.find(s => s.id === 'debuff');
    if (debuff && enemyDebuffStacks < 3 && Math.random() < 0.25) return debuff;
    // 優先4: オフェンシブスキルからランダム選択
    const offOptions = ['magic', 'boost', 'swift'].map(id => skills.find(s => s.id === id)).filter(Boolean);
    if (offOptions.length) return pickRnd(offOptions);
    return skills[0]; // こうげき
  }

  while (G.battleParty.some((_, i) => partyHp[i] > 0) && eHp > 0) {
    showBattleStatus();

    const aliveLeaderIdx = partyHp.findIndex(hp => hp > 0);
    const choice         = await menu('どうする？', ['たたかう！', 'にげる']);

    if (choice === 1) {
      // にげる
      for (let i = 0; i < G.battleParty.length; i++) G.battleParty[i].currentHp = partyHp[i];
      clearScreen();
      print();
      print('  うまく にげられた！');
      for (const m of G.battleParty) m.heal();
      print('  （パーティは ひとやすみして HPが かいふくした）');
      await pause();
      return;
    }

    const chosenSkill = pickAutoSkill(aliveLeaderIdx);
    turns++;
    const roundData   = [];
    let   partyGuard  = false;   // このターン限り

    // ── 行動順を決定 ──
    const actors = G.battleParty
      .map((m, i) => partyHp[i] > 0 ? ['p', i, m.spd] : null)
      .filter(Boolean);
    actors.push(['e', -1, enemy.spd]);
    actors.sort((a, b) => b[2] - a[2]);

    for (const [kind, ai] of actors) {
      if (eHp <= 0) break;

      if (kind === 'p') {
        if (partyHp[ai] <= 0) continue;
        const m  = G.battleParty[ai];
        const pm = elemMult(m.elem(), enemy.elem());
        if (pm > 1.0) elemAdv = true;
        const adv = pm > 1.0;

        if (ai === aliveLeaderIdx) {
          // ── リーダーのスキル使用 ──
          switch (chosenSkill.id) {

            case 'magic': {
              // DEFを無視、1.5倍威力の魔法
              const dmg = Math.max(1, Math.round(m.atk * pm * 1.5));
              eHp = Math.max(0, eHp - dmg);
              roundData.push({ type:'magic', isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:enemy.name, tgtElem:enemy.elem(), dmg, adv });
              log.push(`  ${m.name} まほう → ${enemy.name}  ${dmg}ダメージ！`);
              break;
            }

            case 'heal': {
              // HP%が最低の生存メンバーを回復
              const healAmt = Math.max(5, Math.floor(m.atk * 0.7));
              let ti = aliveLeaderIdx;
              let lowestPct = partyHp[aliveLeaderIdx] / G.battleParty[aliveLeaderIdx].maxHp;
              for (let j = 0; j < G.battleParty.length; j++) {
                if (partyHp[j] > 0) {
                  const pct = partyHp[j] / G.battleParty[j].maxHp;
                  if (pct < lowestPct) { lowestPct = pct; ti = j; }
                }
              }
              const prev  = partyHp[ti];
              partyHp[ti] = Math.min(G.battleParty[ti].maxHp, partyHp[ti] + healAmt);
              const actual = partyHp[ti] - prev;
              const healed = G.battleParty[ti];
              roundData.push({ type:'heal', isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:healed.name, tgtElem:healed.elem(), healAmt:actual || healAmt });
              log.push(`  ${m.name} かいふく → ${healed.name}  +${actual}HP！`);
              break;
            }

            case 'guard': {
              // 防御態勢：このターン敵ダメ半減 ＋ 弱めの攻撃
              partyGuard = true;
              const dmg  = Math.max(1, Math.floor(m.atk * pm * 0.7) - Math.floor(enemy.def_ / 2));
              eHp = Math.max(0, eHp - dmg);
              roundData.push({ type:'guard', isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:enemy.name, tgtElem:enemy.elem(), dmg, adv });
              log.push(`  ${m.name} まもり → ${enemy.name}  ${dmg}ダメージ！`);
              break;
            }

            case 'debuff': {
              // 敵ATKを永続ダウン（最大3スタック）
              enemyDebuffStacks = Math.min(3, enemyDebuffStacks + 1);
              const dmg = Math.max(1, Math.floor(m.atk * pm * 0.6) - Math.floor(enemy.def_ / 2));
              eHp = Math.max(0, eHp - dmg);
              roundData.push({ type:'debuff', isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:enemy.name, tgtElem:enemy.elem(), dmg, adv, debuffStacks:enemyDebuffStacks });
              log.push(`  ${m.name} じゅもん → ${enemy.name}  こうげき-${enemyDebuffStacks*20}%！`);
              break;
            }

            case 'swift': {
              // 2連続攻撃（各65%）
              for (let h = 1; h <= 2; h++) {
                if (eHp <= 0) break;
                const dmg = Math.max(1, Math.floor(m.atk * pm * 0.65) - Math.floor(enemy.def_ / 2));
                eHp = Math.max(0, eHp - dmg);
                roundData.push({ type:'swift', hit:h, isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:enemy.name, tgtElem:enemy.elem(), dmg, adv });
                log.push(`  ${m.name} れんげき${h}hit → ${enemy.name}  ${dmg}ダメージ！`);
              }
              break;
            }

            case 'boost': {
              // きあい：ATK1.5倍で攻撃
              const dmg = Math.max(1, Math.floor(m.atk * pm * 1.5) - Math.floor(enemy.def_ / 2));
              eHp = Math.max(0, eHp - dmg);
              roundData.push({ type:'boost', isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:enemy.name, tgtElem:enemy.elem(), dmg, adv });
              log.push(`  ${m.name} きあい → ${enemy.name}  ${dmg}ダメージ！`);
              break;
            }

            default: { // 'attack'
              const dmg = Math.max(1, Math.floor(m.atk * pm) - Math.floor(enemy.def_ / 2));
              eHp = Math.max(0, eHp - dmg);
              roundData.push({ type:'attack', isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:enemy.name, tgtElem:enemy.elem(), dmg, adv });
              log.push(`  ${m.name} → ${enemy.name}  ${dmg}ダメージ！${adv ? ' ★ぞくせいゆうり！' : ''}`);
              break;
            }
          }
        } else {
          // ── サブメンバーは自動攻撃 ──
          const dmg = Math.max(1, Math.floor(m.atk * pm) - Math.floor(enemy.def_ / 2));
          eHp = Math.max(0, eHp - dmg);
          roundData.push({ type:'attack', isParty:true, atkName:m.name, atkElem:m.elem(), tgtName:enemy.name, tgtElem:enemy.elem(), dmg, adv });
          log.push(`  ${m.name} → ${enemy.name}  ${dmg}ダメージ！${adv ? ' ★ぞくせいゆうり！' : ''}`);
        }

      } else {
        // ── 敵の攻撃 ──
        const alive = partyHp.map((hp, i) => hp > 0 ? i : -1).filter(i => i >= 0);
        if (!alive.length) break;
        const ti  = pickRnd(alive);
        const tgt = G.battleParty[ti];
        const em  = elemMult(enemy.elem(), tgt.elem());
        const debuffMult = Math.max(0.4, 1 - enemyDebuffStacks * 0.2);
        let   dmg = Math.max(1, Math.floor(enemy.atk * em * debuffMult) - Math.floor(tgt.def_ / 2));
        if (partyGuard) dmg = Math.max(1, Math.floor(dmg * 0.5));
        partyHp[ti] = Math.max(0, partyHp[ti] - dmg);
        flawless = false;
        roundData.push({ type:'attack', isParty:false, atkName:enemy.name, atkElem:enemy.elem(), tgtName:tgt.name, tgtElem:tgt.elem(), dmg, adv:false, guarded:partyGuard });
        log.push(`  ${enemy.name} → ${tgt.name}  ${dmg}ダメージ！`);
      }
    }

    // ラウンド結果
    clearScreen();
    refreshBattleGraphics();
    print();
    for (const d of roundData) {
      printBattleAction(d);
    }

    if (G.battleParty.some((_, i) => partyHp[i] > 0) && eHp > 0) {
      await pause();
    }
  }

  const won = eHp <= 0 && G.battleParty.some((_, i) => partyHp[i] > 0);

  let bm = 1.0;
  if (won) {
    if (turns <= 3) bm *= 1.2;
    if (flawless)   bm *= 1.3;
    if (elemAdv)    bm *= 1.1;
    const avgLv = G.battleParty.reduce((s,m)=>s+m.level,0) / G.battleParty.length;
    if (avgLv > enemy.level + 3) bm *= 0.8;
  }
  G.battleLog = log;

  print();
  if (won) {
    print('  ★ かちだ！', 'bright');
    if (flawless) print('  きずひとつない かんぜんしょうり！');
    if (elemAdv)  print('  ぞくせいゆうり ボーナス！');
    for (let i = 0; i < G.battleParty.length; i++) G.battleParty[i].currentHp = partyHp[i];
    const exp = enemy.level * 6 + randInt(1, 6);
    print(`\n  けいけんち +${exp}！`);
    for (const m of G.battleParty) {
      const prevLv = m.level;
      const lvMsgs = m.gainExp(exp);
      for (let li = 0; li < lvMsgs.length; li++) {
        printRich('bright', '  ', makeNameBadge(m.name, m.elem(), 'party'), ` は レベル ${prevLv + li + 1} に あがった！`);
      }
    }
  } else {
    print('  ……たおれてしまった', 'dim');
  }

  for (const m of G.battleParty) m.heal();
  print('  （パーティは ひとやすみして HPが かいふくした）', 'dim');
  autoSave();
  await pause();

  if (!won) return;

  for (const m of G.battleParty) {
    const insp = checkInsp(m);
    if (insp) { await inspiration(m, insp); return; }
  }

  const base = 0.3;
  const rm   = RARITY_RECRUIT[enemy.rarity()] || 1.0;
  const rate = Math.min(0.90, Math.max(0.02, base * rm * bm));
  if (Math.random() < rate) await recruit(enemy);
}

// ===================================================
// ===== 勧誘 =====
// ===================================================
async function recruit(enemy) {
  clearScreen();
  showSingleCard(enemy, enemy.maxHp);
  print();
  printRich('bright', '  ', makeNameBadge(enemy.name, enemy.elem(), 'enemy'), ' が なかまに なりたそうに こちらを みている！');
  print();

  const idx = await menu('なかまにする？', ['はい！', 'いいえ']);
  if (idx === 1) {
    print();
    printRich('', '  ', makeNameBadge(enemy.name, enemy.elem(), 'enemy'), ' は さっていった。');
    await pause();
    return;
  }

  enemy.heal();
  unlock(enemy.chars);
  G.monsters.push(enemy);
  print();
  printRich('bright', '  ', makeNameBadge(enemy.name, enemy.elem(), 'enemy'), ' が なかまに なった！');
  print(`  所持モンスター: ${G.monsters.length}体`);

  if (G.battleParty.length < BATTLE_MAX) {
    G.battleParty.push(enemy);
    print(`  戦闘パーティに くわわった！  (${G.battleParty.length}/${BATTLE_MAX}体)`);
  } else {
    print('  ※ 戦闘パーティが いっぱいです。', 'dim');
  }
  autoSave();
  await pause();
}

// ===================================================
// ===== ひらめき =====
// ===================================================
async function inspiration(monster, newChar) {
  clearScreen();
  // フラッシュ演出
  $gfx().classList.remove('hidden');
  $gfx().classList.add('insp-flash');
  $gfx().innerHTML = '';
  setTimeout(() => $gfx().classList.remove('insp-flash'), 1600);

  print();
  print('  ✨ ひらめき！', 'bright');
  print();
  printRich('', '  ', makeNameBadge(monster.name, monster.elem(), 'party'), ` が レベル ${monster.level} に なった！`);
  print('  あたらしい 文字が かがやいている……');
  print();
  printSep();

  const cd = G.allChars[newChar];
  if (cd) {
    print();
    print(`  ★ 新しい文字 「${newChar}」  [${cd.rarity}]  ${ELEM_JP[cd.element] || '?'}属性`, 'bright');
  }
  print();

  const idx = await menu('ひらめきを つかう？', ['つかう！', 'みおくる']);
  monster.inspirationUsed = true;

  if (idx === 0 && cd) {
    unlock([cd]);

    const cands = {};
    for (const pname of [...monster.parents, ...monster.grandparents]) {
      for (const ch of pname) {
        if (G.allChars[ch]) cands[ch] = G.allChars[ch];
      }
    }
    for (const ch of monster.chars) cands[ch.char] = ch;
    cands[newChar] = cd;
    const pool = Object.values(cands);

    const oldParents = [...monster.parents];
    monster.grandparents = oldParents;
    monster.parents = [monster.name];

    clearScreen();
    print();
    print('  新しい名前を つけてあげよう。', 'bright');

    const newChars = await pickChars('つかえる文字', pool, 3);
    const newName  = newChars.map(c => c.char).join('');

    monster.name  = newName;
    monster.chars = newChars;
    monster.calc();

    clearScreen();
    showSingleCard(monster, monster.currentHp);
    print();
    printRich('bright', '  ', makeNameBadge(newName, monster.elem(), 'party'), ' に しんかした！');
    print(`  [${monster.rarity()}]  ${ELEM_JP[monster.elem()]}属性  Lv${monster.level}`);
  } else {
    print('\n  ひらめきは きえていった……', 'dim');
  }
  autoSave();
  await pause();
}

// ===================================================
// ===== なかまメニュー =====
// ===================================================

/** モンスターの代表ロールを返す */
function monsterRole(m) {
  const cnt = {};
  for (const c of m.chars) cnt[c.role] = (cnt[c.role] || 0) + 1;
  return Object.entries(cnt).sort((a,b) => b[1]-a[1])[0]?.[0] || 'utility';
}

/** ロースターカードDOM生成（ボックス・pickMonster共用） */
function makeRosterCard(m) {
  const rar  = m.rarity();
  const elem = m.elem();
  const role = monsterRole(m);
  const nameLen = [...m.name].length;

  const card = document.createElement('div');
  card.className = `roster-card rarity-${rar}`;

  // レア度バッジ
  const badge = document.createElement('div');
  badge.className = 'rc-badge';
  badge.textContent = RARITY_ICON[rar] || rar;
  card.appendChild(badge);

  // 属性アイコン
  const elemDiv = document.createElement('div');
  elemDiv.className = 'rc-elem';
  elemDiv.textContent = ELEM_ICON[elem] || '○';
  card.appendChild(elemDiv);

  // 文字名
  const kanji = document.createElement('div');
  kanji.className = `rc-kanji ${nameLen >= 2 ? 'len'+nameLen : ''} ${ELEM_CLASS[elem] || ''}`;
  kanji.textContent = m.name;
  card.appendChild(kanji);

  // Lv＋ロール
  const lv = document.createElement('div');
  lv.className = 'rc-lv';
  lv.textContent = `Lv${m.level}`;
  card.appendChild(lv);

  const roleDiv = document.createElement('div');
  roleDiv.className = 'rc-role';
  roleDiv.textContent = (ROLE_ICON[role] || '') + ' ' + (ROLE_JP[role] || '');
  card.appendChild(roleDiv);

  // HP バー
  const hp = document.createElement('div');
  hp.className = 'rc-hp';
  const hpf = document.createElement('div');
  hpf.className = 'rc-hp-fill';
  hpf.style.width = (m.maxHp > 0 ? Math.round(Math.max(0, m.currentHp) / m.maxHp * 100) : 0) + '%';
  hp.appendChild(hpf);
  card.appendChild(hp);

  return card;
}

/** ロースターUI（なかまメニューのメイン画面）
 *  戻り値: 'back' | 'detail' | 'breed'
 */
async function showRosterUI() {
  return new Promise(resolve => {
    let swapTarget = null; // パーティ満員時に追加待ちのボックスモンスター
    const screen = document.getElementById('screen');

    function finish(result) {
      screen.classList.remove('roster-mode');
      $btns().innerHTML = '';
      resolve(result);
    }

    function render() {
      const bc = $btns();
      bc.innerHTML = '';
      screen.classList.add('roster-mode');

      const wrap = document.createElement('div');
      wrap.className = 'roster-wrap';

      // ─── パーティセクション ───
      const ptSection = document.createElement('div');
      ptSection.className = 'roster-party-section';

      const lbl = document.createElement('div');
      lbl.className = 'roster-section-label' + (swapTarget ? ' swap-mode' : '');
      lbl.textContent = swapTarget
        ? `「${swapTarget.name}」と交換するメンバーを選んでください`
        : `パーティ (${G.battleParty.length}/${BATTLE_MAX})  ─ タップではずす`;
      ptSection.appendChild(lbl);

      const ptRow = document.createElement('div');
      ptRow.className = 'roster-party-row';

      for (let i = 0; i < BATTLE_MAX; i++) {
        const m = G.battleParty[i];
        const slot = document.createElement('div');

        if (m) {
          const rar      = m.rarity();
          const elem     = m.elem();
          const isLeader = (i === 0);
          const canRem   = G.battleParty.length > 1;
          let cls = `roster-party-slot filled rarity-${rar}`;
          if (isLeader)  cls += ' leader';
          if (!canRem)   cls += ' no-remove';
          if (swapTarget) cls += ' swap-select';
          slot.className = cls;

          // クリック処理
          if (swapTarget && canRem) {
            slot.onclick = () => { G.battleParty[i] = swapTarget; swapTarget = null; render(); };
          } else if (!swapTarget && canRem) {
            slot.onclick = () => { G.battleParty.splice(i, 1); render(); };
          }

          // リーダーマーク
          if (isLeader) {
            const lm = document.createElement('div');
            lm.className = 'slot-leader-mark'; lm.textContent = '▶';
            slot.appendChild(lm);
          }
          // レア度バッジ
          const rb = document.createElement('div');
          rb.className = 'slot-rar-badge';
          rb.textContent = RARITY_ICON[rar] || rar;
          slot.appendChild(rb);

          // コンテンツ
          const cnt = document.createElement('div');
          cnt.className = 'slot-content';

          const ed = document.createElement('div');
          ed.className = 'slot-elem';
          ed.textContent = ELEM_ICON[elem] || '○';
          cnt.appendChild(ed);

          const nl = [...m.name].length;
          const nd = document.createElement('div');
          nd.className = `slot-name ${nl >= 2 ? 'len'+nl : ''} ${ELEM_CLASS[elem] || ''}`;
          nd.textContent = m.name;
          cnt.appendChild(nd);

          const ld = document.createElement('div');
          ld.className = 'slot-lv';
          ld.textContent = `Lv${m.level}`;
          cnt.appendChild(ld);

          const hb = document.createElement('div');
          hb.className = 'slot-hp-bar';
          const hf = document.createElement('div');
          hf.className = 'slot-hp-fill';
          hf.style.width = (m.maxHp > 0 ? Math.round(Math.max(0, m.currentHp) / m.maxHp * 100) : 0) + '%';
          hb.appendChild(hf); cnt.appendChild(hb);

          // ヒント文
          if (swapTarget) {
            const h = document.createElement('div');
            h.className = 'slot-swap-hint'; h.textContent = 'ここに交換';
            cnt.appendChild(h);
          } else if (canRem) {
            const h = document.createElement('div');
            h.className = 'slot-remove-hint'; h.textContent = 'タップ: はずす';
            cnt.appendChild(h);
          }
          slot.appendChild(cnt);
        } else {
          slot.className = 'roster-party-slot empty';
          slot.textContent = '空きスロット';
        }
        ptRow.appendChild(slot);
      }
      ptSection.appendChild(ptRow);
      wrap.appendChild(ptSection);

      // ─── ボックスセクション ───
      const box = G.monsters.filter(m => !G.battleParty.includes(m));

      const bh = document.createElement('div');
      bh.className = 'roster-box-header';
      const bt = document.createElement('span');
      bt.textContent = swapTarget
        ? `ボックス (${box.length}体)  ─ 上のパーティスロットをタップ`
        : `ボックス (${box.length}体)  ─ タップでパーティに追加`;
      bh.appendChild(bt);
      if (swapTarget) {
        const cb = document.createElement('button');
        cb.className = 'action-btn type-cancel';
        cb.style.cssText = 'padding:1px 8px;font-size:10px;height:auto;min-height:0;';
        cb.textContent = 'キャンセル';
        cb.onclick = () => { swapTarget = null; render(); };
        bh.appendChild(cb);
      }
      wrap.appendChild(bh);

      const bs = document.createElement('div');
      bs.className = 'roster-box-scroll';
      const bg = document.createElement('div');
      bg.className = 'roster-box-grid';

      if (!box.length) {
        const em = document.createElement('div');
        em.className = 'roster-empty-msg';
        em.textContent = 'ボックスにモンスターはいません';
        bg.appendChild(em);
      }

      for (const m of box) {
        const card = makeRosterCard(m);
        const isFull = G.battleParty.length >= BATTLE_MAX;
        if (swapTarget) {
          card.classList.add('swap-dim');
        } else if (isFull) {
          card.onclick = () => { swapTarget = m; render(); };
        } else {
          card.classList.add('add-mode');
          card.onclick = () => { G.battleParty.push(m); render(); };
        }
        bg.appendChild(card);
      }
      bs.appendChild(bg);
      wrap.appendChild(bs);

      // ─── アクションボタン行 ───
      const ar = document.createElement('div');
      ar.className = 'roster-action-row';
      const acts = [
        { lbl: 'くわしくみる', icon: '◎', cls: 'type-info',   res: 'detail' },
        { lbl: '配合する',     icon: '⊕', cls: 'type-action', res: 'breed'  },
        { lbl: 'もどる',       icon: '←', cls: 'type-back',   res: 'back'   },
      ];
      for (const a of acts) {
        const btn = document.createElement('button');
        btn.className = `action-btn ${a.cls}`;
        const ic = document.createElement('span');
        ic.className = 'btn-icon'; ic.textContent = a.icon;
        btn.appendChild(ic);
        btn.appendChild(document.createTextNode(a.lbl));
        btn.onclick = () => finish(a.res);
        ar.appendChild(btn);
      }
      wrap.appendChild(ar);
      bc.appendChild(wrap);
    }

    render();
  });
}

async function partyMenu() {
  while (true) {
    clearScreen();
    hideGraphics();

    const result = await showRosterUI();
    if (result === 'back') break;
    if (result === 'detail') await detailView();
    if (result === 'breed') {
      if (G.monsters.length < 2) {
        clearScreen();
        print('\n  モンスターが 2体 いないと 配合できない。');
        await pause();
      } else {
        await breed();
      }
    }
  }
}

/** モンスター選択（ビジュアルカード版） */
async function pickMonster(prompt, exclude = null) {
  const cands = G.monsters.filter(m => m !== exclude);
  if (!cands.length) return null;

  return new Promise(resolve => {
    const screen = document.getElementById('screen');
    screen.classList.add('roster-mode');

    const bc = $btns();
    bc.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'roster-wrap';

    // ヘッダー
    const hd = document.createElement('div');
    hd.className = 'roster-box-header';
    hd.style.fontSize = '12px';
    hd.style.color = 'var(--text-mid)';
    hd.textContent = `${prompt}  （タップして選択）`;
    wrap.appendChild(hd);

    // カードグリッド
    const sc = document.createElement('div');
    sc.className = 'roster-box-scroll';
    const gd = document.createElement('div');
    gd.className = 'roster-box-grid';

    for (const m of cands) {
      const card = makeRosterCard(m);
      card.onclick = () => {
        screen.classList.remove('roster-mode');
        bc.innerHTML = '';
        resolve(m);
      };
      gd.appendChild(card);
    }
    sc.appendChild(gd);
    wrap.appendChild(sc);

    // キャンセルボタン
    const ar = document.createElement('div');
    ar.className = 'roster-action-row';
    ar.style.gridTemplateColumns = '1fr';
    const cb = document.createElement('button');
    cb.className = 'action-btn type-back';
    const ic = document.createElement('span');
    ic.className = 'btn-icon'; ic.textContent = '←';
    cb.appendChild(ic);
    cb.appendChild(document.createTextNode('やめた'));
    cb.onclick = () => {
      screen.classList.remove('roster-mode');
      bc.innerHTML = '';
      resolve(null);
    };
    ar.appendChild(cb);
    wrap.appendChild(ar);
    bc.appendChild(wrap);
  });
}

async function detailView() {
  const m = await pickMonster('くわしく みる モンスター');
  if (!m) return;
  clearScreen();
  showSingleCard(m, m.currentHp);
  print();
  for (const line of m.fullStatus()) print(line);
  await pause();
}

// ===================================================
// ===== 配合 =====
// ===================================================
async function breed() {
  if (G.monsters.length < 2) {
    print('\n  モンスターが 2体 いないと 配合できない。');
    await pause();
    return;
  }
  clearScreen();
  print();
  print('  ■ 配合', 'bright');
  print();
  print('  2体の文字を あわせて あたらしい');
  print('  モンスターを うみだす。');
  print('  ※ つかった 2体は いなくなります。');
  print();

  const p1 = await pickMonster('親1を えらぶ');
  if (!p1) return;
  const p2 = await pickMonster('親2を えらぶ', p1);
  if (!p2) return;

  clearScreen();
  // 配合確認: 2体を並べて表示
  const gfx = $gfx();
  gfx.innerHTML = '';
  gfx.className = 'battle-mode';
  const bl = document.createElement('div'); bl.className = 'battle-left';
  bl.appendChild(makeMonsterCard(p1, p1.currentHp, 'solo'));
  gfx.appendChild(bl);
  const bc2 = document.createElement('div'); bc2.className = 'battle-center';
  const vsTxt = document.createElement('div'); vsTxt.className = 'vs-label'; vsTxt.textContent = '×';
  bc2.appendChild(vsTxt); gfx.appendChild(bc2);
  const br = document.createElement('div'); br.className = 'battle-right';
  const rc = makeMonsterCard(p2, p2.currentHp, 'solo'); rc.style.flex = '1'; br.appendChild(rc);
  gfx.appendChild(br);
  print();
  printRich('bright', '  ', makeNameBadge(p1.name, p1.elem(), ''), '  ×  ', makeNameBadge(p2.name, p2.elem(), ''));
  print(`  [${p1.rarity()}]       [${p2.rarity()}]`);
  print();
  if (await menu('配合する？', ['する！', 'やめる']) === 1) {
    print('  やめた。'); await pause(); return;
  }

  const cands = {};
  for (const ch of [...p1.chars, ...p2.chars]) cands[ch.char] = ch;
  for (const pname of [...p1.parents, ...p2.parents].slice(0, 4)) {
    for (const c of pname) {
      if (G.allChars[c]) cands[c] = G.allChars[c];
    }
  }
  const pool = Object.values(cands);

  clearScreen();
  print();
  print(`  子どもの 名前を きめよう。`, 'bright');
  print(`  （親1「${p1.name}」＋親2「${p2.name}」の文字）`);

  const newChars = await pickChars('つかえる文字', pool, 3);
  const newName  = newChars.map(c => c.char).join('');
  const childLv  = 1;
  const child = new Monster({
    name: newName, chars: newChars, level: childLv,
    parents: [p1.name, p2.name],
    grandparents: [...p1.parents, ...p2.parents].slice(0, 4),
  });
  child.calc();
  unlock(newChars);

  for (const p of [p1, p2]) {
    const bi = G.battleParty.indexOf(p);
    if (bi >= 0) G.battleParty.splice(bi, 1);
    G.monsters.splice(G.monsters.indexOf(p), 1);
  }
  G.monsters.push(child);
  if (G.battleParty.length < BATTLE_MAX) G.battleParty.push(child);

  clearScreen();
  showSingleCard(child, child.currentHp);
  print();
  printRich('bright', '  ', makeNameBadge(newName, child.elem(), 'party'), ' が うまれた！');
  print(`  [${child.rarity()}]  ${ELEM_JP[child.elem()]}属性  Lv${child.level}`);
  print();
  printRich('dim', '  ※ ', makeNameBadge(p1.name, p1.elem(), ''), ' と ', makeNameBadge(p2.name, p2.elem(), ''), ' は 旅立った……');
  autoSave();
  await pause();
}

// ===================================================
// ===== ぼうけんのしょ =====
// ===================================================
async function bookMenu() {
  while (true) {
    clearScreen();
    print();
    print('  ■ ぼうけんのしょ', 'bright');
    print();
    const idx = await menu('どうする？', ['きろくする', 'よみなおす', 'さいきんのたたかい', 'もどる']);
    if      (idx === 0) await saveMenu();
    else if (idx === 1) await loadMenu(false);
    else if (idx === 2) await viewLog();
    else break;
  }
}

function slotLabels() {
  return Array.from({length: SLOTS}, (_, i) => `S${i+1}: ${slotInfo(i+1)}`);
}

async function saveMenu() {
  clearScreen();
  print('\n  ■ きろくする\n');
  const labels = [...slotLabels(), 'もどる'];
  const idx = await menu('どこに きろくする？', labels);
  if (idx === SLOTS) return;
  G.autoSaveSlot = idx + 1;
  saveGame(G.autoSaveSlot);
  print(`\n  スロット${G.autoSaveSlot} に きろくした！`, 'bright');
  await pause();
}

async function loadMenu(fromTitle) {
  clearScreen();
  print('\n  ■ よみなおす\n');
  const labels = [...slotLabels(), 'もどる'];
  const idx = await menu('どれを よむ？', labels);
  if (idx === SLOTS) return false;
  const slot = idx + 1;
  if (slotInfo(slot) === '(空)') {
    print(`\n  スロット${slot} は 空です。`);
    await pause();
    return false;
  }
  const ok = loadGame(slot);
  if (ok) {
    G.autoSaveSlot = slot;
    print(`\n  スロット${slot} を よみこんだ！`, 'bright');
    if (!fromTitle) await pause();
  } else {
    print('\n  よみこみに しっぱいした。');
    await pause();
  }
  return ok;
}

async function viewLog() {
  clearScreen();
  print('\n  ■ さいきんのたたかい\n');
  if (!G.battleLog.length) {
    print('  まだ たたかいの きろくが ありません。');
  } else {
    for (const line of G.battleLog) print(line);
  }
  await pause();
}

// ===================================================
// ===== ずかん =====
// ===================================================
async function zukan() {
  while (true) {
    clearScreen();
    const total = Object.keys(G.allChars).length;
    const have  = Object.keys(G.unlocked).length;
    const rarCnt = {N:0, R:0, SR:0, SSR:0};
    for (const m of G.monsters) rarCnt[m.rarity()] = (rarCnt[m.rarity()] || 0) + 1;
    const cStr = ['N','R','SR','SSR'].map(r => `${r}:${rarCnt[r]}体`).join('  ');

    print();
    print('  ■ ずかん', 'bright');
    print();
    print(`  解禁文字      : ${have} / ${total}`);
    print(`  所持モンスター: ${G.monsters.length}体`);
    print(`  レア度内訳    : ${cStr}`);
    print();

    const idx = await menu('', ['解禁文字リスト', 'ひらめきマップ', 'もどる']);
    if      (idx === 0) await zukanChars();
    else if (idx === 1) await inspTree();
    else break;
  }
}

async function zukanChars() {
  clearScreen();
  const byElem = {};
  for (const ch of Object.values(G.unlocked)) {
    (byElem[ch.element] = byElem[ch.element] || []).push(ch);
  }
  print();
  print(`  ■ 解禁文字リスト  (${Object.keys(G.unlocked).length}/${Object.keys(G.allChars).length})`, 'bright');
  print();
  printSep();
  for (const ek of Object.keys(byElem).sort()) {
    const ej  = ELEM_JP[ek] || ek;
    const str = byElem[ek].map(c => `${c.char}(${c.rarity})`).join('  ');
    print(`  [${ej}]  ${str}`);
  }
  await pause();
}

async function inspTree() {
  clearScreen();

  const recipes = {};
  for (const [key, out] of Object.entries(G.inspMap)) {
    (recipes[out] = recipes[out] || []).push(key.split('|'));
  }

  // SSR→SR→R→N順、解禁済み優先でソート
  const sortedOuts = Object.keys(recipes).sort((a, b) => {
    const ra = (G.allChars[a] || {}).rarity || 'N';
    const rb = (G.allChars[b] || {}).rarity || 'N';
    const rd = (RARITY_ORDER[rb] || 0) - (RARITY_ORDER[ra] || 0);
    if (rd !== 0) return rd;
    return (G.unlocked[b] ? 1 : 0) - (G.unlocked[a] ? 1 : 0);
  });

  const unlockedCnt = sortedOuts.filter(ch => G.unlocked[ch]).length;
  const RAR_COL = { R: 'var(--rar-r)', SR: 'var(--rar-sr)', SSR: 'var(--rar-ssr)' };

  // ── ヘルパー：入力文字ブロック（小） ──
  function makeInBox(inCh) {
    const inCd  = G.allChars[inCh] || {};
    const inOk  = !!G.unlocked[inCh];
    const box   = document.createElement('div');
    box.className = `insp-kanji-box ${ELEM_CLASS[inCd.element] || 'elem-neutral'}${inOk ? '' : ' insp-locked-char'}`;
    box.textContent = inCh;
    return box;
  }

  const wrap = document.createElement('div');
  wrap.className = 'insp-map-wrap';

  // ── ヘッダー ──
  const hdr = document.createElement('div');
  hdr.className = 'insp-map-header';

  const hdrLeft = document.createElement('div');
  hdrLeft.style.display = 'flex'; hdrLeft.style.flexDirection = 'column'; hdrLeft.style.gap = '5px';

  const hdrTitle = document.createElement('span');
  hdrTitle.className = 'insp-map-title-text';
  hdrTitle.textContent = '■ ひらめきマップ';

  // タブボタン
  const tabs = document.createElement('div');
  tabs.className = 'insp-tabs';
  const tabList = document.createElement('button');
  tabList.className = 'insp-tab active';
  tabList.textContent = 'リスト';
  const tabTree = document.createElement('button');
  tabTree.className = 'insp-tab';
  tabTree.textContent = 'ツリー';
  tabs.appendChild(tabList);
  tabs.appendChild(tabTree);

  hdrLeft.appendChild(hdrTitle);
  hdrLeft.appendChild(tabs);

  const hdrR = document.createElement('span');
  hdrR.className = 'insp-map-count';
  hdrR.textContent = `解禁 ${unlockedCnt} / ${sortedOuts.length}`;

  hdr.appendChild(hdrLeft);
  hdr.appendChild(hdrR);
  wrap.appendChild(hdr);

  // ── コンテンツエリア ──
  const content = document.createElement('div');
  wrap.appendChild(content);

  // ── リスト表示（デフォルト） ──
  function renderList() {
    content.innerHTML = '';
    for (const outCh of sortedOuts) {
      const outCd   = G.allChars[outCh] || {};
      const outRar  = outCd.rarity || 'N';
      const outElem = outCd.element || 'neutral';
      const outOk   = !!G.unlocked[outCh];

      for (const inputs of recipes[outCh]) {
        const card = document.createElement('div');
        card.className = 'insp-card' + (outOk ? ' insp-unlocked' : '');

        // 入力文字群
        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'insp-inputs';
        for (let i = 0; i < inputs.length; i++) {
          if (i > 0) {
            const plus = document.createElement('span');
            plus.className = 'insp-plus'; plus.textContent = '+';
            inputsDiv.appendChild(plus);
          }
          const inCh = inputs[i];
          const inCd = G.allChars[inCh] || {};
          const inRar = inCd.rarity || '?';
          const inOk  = !!G.unlocked[inCh];
          const block = document.createElement('div');
          block.className = 'insp-char-block';
          const box = document.createElement('div');
          box.className = `insp-kanji-box ${ELEM_CLASS[inCd.element] || 'elem-neutral'}${inOk ? '' : ' insp-locked-char'}`;
          box.textContent = inCh;
          const lbl = document.createElement('div');
          lbl.className = 'insp-char-label';
          lbl.textContent = RARITY_ICON[inRar] || inRar;
          if (RAR_COL[inRar]) lbl.style.color = RAR_COL[inRar];
          block.appendChild(box); block.appendChild(lbl);
          inputsDiv.appendChild(block);
        }
        card.appendChild(inputsDiv);

        const arrow = document.createElement('div');
        arrow.className = 'insp-arrow'; arrow.textContent = '▶';
        card.appendChild(arrow);

        // 出力文字
        const outBlock = document.createElement('div');
        outBlock.className = 'insp-output-block';
        const outBox = document.createElement('div');
        outBox.className = `insp-output-box ${ELEM_CLASS[outElem] || 'elem-neutral'}${outOk ? ' insp-output-glow' : ''}`;
        if (RAR_COL[outRar]) outBox.style.borderColor = RAR_COL[outRar];
        outBox.textContent = outCh;
        const outLbl = document.createElement('div');
        outLbl.className = 'insp-output-label';
        outLbl.textContent = (RARITY_ICON[outRar] || outRar) + (outOk ? '  解禁✓' : '  未解禁');
        if (outOk && RAR_COL[outRar]) outLbl.style.color = RAR_COL[outRar];
        outBlock.appendChild(outBox); outBlock.appendChild(outLbl);
        card.appendChild(outBlock);

        content.appendChild(card);
      }
    }
  }

  // ── DQM配合表スタイル ノードツリー ──
  function renderTree() {
    content.innerHTML = '';
    const MAX_DEPTH = 5;

    // ── キャラノード生成 ──
    function makeNode(ch, size) {
      const cd  = G.allChars[ch] || {};
      const rar = cd.rarity || 'N';
      const ok  = !!G.unlocked[ch];
      const el  = ELEM_CLASS[cd.element] || 'elem-neutral';
      const wrap = document.createElement('div');
      wrap.className = `dq-node dq-${size} ${el} dq-rar-${rar}` + (ok ? ' dq-ok' : ' dq-locked');

      const kanji = document.createElement('div');
      kanji.className = 'dq-kanji'; kanji.textContent = ch;
      wrap.appendChild(kanji);

      const badge = document.createElement('div');
      badge.className = 'dq-badge';
      badge.textContent = RARITY_ICON[rar] + rar;
      if (RAR_COL[rar]) badge.style.color = RAR_COL[rar];
      wrap.appendChild(badge);

      if (size === 'lg') {
        const elem = document.createElement('div');
        elem.className = 'dq-elem-label';
        const ELEM_JP = {fire:'炎',water:'水',thunder:'雷',ice:'氷',wind:'風',earth:'土',light:'光',dark:'闇',neutral:'無'};
        elem.textContent = ELEM_JP[cd.element] || '無';
        wrap.appendChild(elem);
      }
      return wrap;
    }

    // ── 配合ペア行 (A × B) ──
    function makePairRow(inputs) {
      const row = document.createElement('div');
      row.className = 'dq-pair-row';
      inputs.forEach((inCh, i) => {
        if (i > 0) {
          const x = document.createElement('div');
          x.className = 'dq-cross'; x.textContent = '×';
          row.appendChild(x);
        }
        row.appendChild(makeNode(inCh, 'md'));
      });
      return row;
    }

    // ── サブチェーン再帰 ──
    function makeSubChain(ch, depth, visited) {
      const recs = recipes[ch];
      if (!recs || visited.has(ch) || depth > MAX_DEPTH) return null;
      const cd = G.allChars[ch] || {};
      const rar = cd.rarity || 'N';
      const newVis = new Set(visited); newVis.add(ch);

      const wrap = document.createElement('div');
      wrap.className = 'dq-sub-chain';

      // 見出し
      const hdr = document.createElement('div');
      hdr.className = 'dq-sub-hdr';
      const hNode = makeNode(ch, 'sm');
      hdr.appendChild(hNode);
      const hTxt = document.createElement('span');
      hTxt.className = 'dq-sub-hdr-txt';
      hTxt.textContent = 'のつくり方';
      if (RAR_COL[rar]) hTxt.style.color = RAR_COL[rar];
      hdr.appendChild(hTxt);
      wrap.appendChild(hdr);

      const body = document.createElement('div');
      body.className = 'dq-sub-body';

      for (const inputs of recs) {
        const recipe = document.createElement('div');
        recipe.className = 'dq-sub-recipe';
        recipe.appendChild(makePairRow(inputs));
        // 再帰
        for (const inCh of inputs) {
          if (!newVis.has(inCh) && recipes[inCh]) {
            const sub = makeSubChain(inCh, depth + 1, newVis);
            if (sub) recipe.appendChild(sub);
          }
        }
        body.appendChild(recipe);
      }
      wrap.appendChild(body);
      return wrap;
    }

    // ── トップレベル ──
    for (const outCh of sortedOuts) {
      const outCd  = G.allChars[outCh] || {};
      const outRar = outCd.rarity || 'N';
      const outOk  = !!G.unlocked[outCh];

      // 外枠カード
      const card = document.createElement('div');
      card.className = 'dq-card' + (outOk ? ' dq-card-ok' : '');
      if (RAR_COL[outRar]) card.style.setProperty('--rar-col', RAR_COL[outRar]);

      // ヘッダー: 大ノード + ステータス
      const hdArea = document.createElement('div');
      hdArea.className = 'dq-card-hd';
      hdArea.appendChild(makeNode(outCh, 'lg'));
      const st = document.createElement('div');
      st.className = 'dq-card-status';
      st.textContent = outOk ? '✓ 解禁済み' : '─ 未解禁 ─';
      if (outOk && RAR_COL[outRar]) st.style.color = RAR_COL[outRar];
      hdArea.appendChild(st);
      card.appendChild(hdArea);

      // レシピ一覧
      if (recipes[outCh]) {
        const sep = document.createElement('div');
        sep.className = 'dq-sep';
        sep.innerHTML = '<span>─── つくり方 ───</span>';
        card.appendChild(sep);

        const recipesArea = document.createElement('div');
        recipesArea.className = 'dq-recipes-area';
        const topVis = new Set([outCh]);

        recipes[outCh].forEach((inputs, ri) => {
          const recipeCard = document.createElement('div');
          recipeCard.className = 'dq-recipe-card';

          if (recipes[outCh].length > 1) {
            const num = document.createElement('div');
            num.className = 'dq-recipe-num';
            num.textContent = `配合${ri + 1}`;
            recipeCard.appendChild(num);
          }

          recipeCard.appendChild(makePairRow(inputs));

          for (const inCh of inputs) {
            if (!topVis.has(inCh) && recipes[inCh]) {
              const sub = makeSubChain(inCh, 1, topVis);
              if (sub) recipeCard.appendChild(sub);
            }
          }
          recipesArea.appendChild(recipeCard);
        });
        card.appendChild(recipesArea);
      }

      content.appendChild(card);
    }
  }

  // タブ切り替え（stopPropagation でバックグラウンドのpauseを誤発火させない）
  tabList.addEventListener('click', e => {
    e.stopPropagation();
    tabList.className = 'insp-tab active';
    tabTree.className = 'insp-tab';
    renderList();
  });
  tabTree.addEventListener('click', e => {
    e.stopPropagation();
    tabList.className = 'insp-tab';
    tabTree.className = 'insp-tab active';
    renderTree();
  });

  renderList();
  $text().appendChild(wrap);
  await pause();
}

// ===== エントリポイント =====
window.addEventListener('DOMContentLoaded', () => {
  initData();
  gameStart();
});
