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
};

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

// バトルグラフィック（敵 VS パーティ全員）
function showBattleGraphics(enemy, eHp, partyHps) {
  const g = $gfx();
  g.innerHTML = '';
  g.className = 'battle-mode';

  // ─── 敵側 ───
  const leftDiv = document.createElement('div');
  leftDiv.className = 'battle-left';
  leftDiv.appendChild(makeMonsterCard(enemy, eHp, 'enemy'));
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

  // ─── 味方側 ───
  const rightDiv = document.createElement('div');
  rightDiv.className = 'battle-right';
  const cnt = G.battleParty.length;
  // パーティ数に応じてカンジサイズ調整
  const kanjiPx = cnt === 1 ? 38 : cnt === 2 ? 28 : 20;

  for (let i = 0; i < cnt; i++) {
    const hp   = Array.isArray(partyHps) ? partyHps[i] : G.battleParty[i].currentHp;
    const card = makeMonsterCard(G.battleParty[i], hp, 'party');
    const kj   = card.querySelector('.card-kanji');
    if (kj) kj.style.fontSize = kanjiPx + 'px';
    if (Array.isArray(partyHps) && partyHps[i] <= 0) card.classList.add('ko');
    rightDiv.appendChild(card);
  }
  g.appendChild(rightDiv);
}

// タイトル画面グラフィック
function showTitleGraphic() {
  const g = $gfx();
  g.innerHTML = '';
  g.className = 'title-mode';

  const wrap = document.createElement('div');
  wrap.className = 'title-graphic';

  const sample = sampleN(Object.values(G.allChars).filter(c => c.rarity === 'R'), 3);
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

  // サイドラベル
  const sideLabel = variant === 'enemy' ? 'てき' : variant === 'party' ? 'みかた' : '';
  if (sideLabel) {
    const sl = document.createElement('div');
    sl.className = 'card-side-label';
    sl.textContent = sideLabel;
    card.appendChild(sl);
  }

  // レア度バッジ
  const badge = document.createElement('div');
  badge.className = 'card-badge';
  badge.textContent = rar;
  card.appendChild(badge);

  // 属性
  const elemDiv = document.createElement('div');
  elemDiv.className = 'card-elem';
  elemDiv.textContent = (ELEM_JP[elem] || '?') + '属性';
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

  // Lv
  const nameDiv = document.createElement('div');
  nameDiv.className = 'card-name';
  nameDiv.textContent = `Lv${monster.level}`;
  card.appendChild(nameDiv);

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

// ---------- 一時停止ボタン ----------
function pause(label = '  ▶ つづける') {
  return new Promise(resolve => {
    ui.inputType     = 'pause';
    ui.inputResolver = resolve;

    const bc = $btns();
    bc.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'action-grid cols-1';
    const btn = document.createElement('button');
    btn.className = 'action-btn pause-btn';
    btn.textContent = label;
    btn.onclick = () => resolvePause();
    grid.appendChild(btn);
    bc.appendChild(grid);
  });
}

function resolvePause() {
  if (ui.inputType !== 'pause' || !ui.inputResolver) return;
  const fn = ui.inputResolver;
  ui.inputType = null; ui.inputResolver = null;
  $btns().innerHTML = '';
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

  const idx = await menu('', ['はじめから', 'ぼうけんのしょをよむ']);
  if (idx === 1) {
    const loaded = await loadMenu(true);
    if (!loaded) { gameStart(); return; }
  } else {
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
    print(`  ▶ ${m.name}  [${m.rarity()}]  Lv${m.level}`, 'bright');
    print(`    HP: ${m.currentHp}/${m.maxHp}  ATK:${m.atk} DEF:${m.def_} SPD:${m.spd}`);
    print(`  なかま: ${G.battleParty.length}/${BATTLE_MAX}体  所持: ${G.monsters.length}体`);
    print();

    const idx = await menu('コマンド', ['ぼうけん', 'なかま', 'ずかん', 'ぼうけんのしょ', 'やめる']);
    if      (idx === 0) await explore();
    else if (idx === 1) await partyMenu();
    else if (idx === 2) await zukan();
    else if (idx === 3) await bookMenu();
    else {
      clearScreen();
      print();
      print('  またね！', 'bright');
      print();
      print('  （ページを閉じてください）');
      return;
    }
  }
}

// ===================================================
// ===== 探索 =====
// ===================================================
async function explore() {
  clearScreen();
  const names = G.battleParty.map(m => m.name).join('　');
  print();
  print(`  ${names} たちは ぼうけんに でかけた……`);
  print();
  await pause();

  const enemy = makeWildEnemy();
  const rar   = enemy.rarity();

  clearScreen();
  showBattleGraphics(enemy, enemy.currentHp, G.battleParty.map(m => m.currentHp));
  print();
  print(`  やせいの 「${enemy.name}」 が あらわれた！`, 'bright');
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
  const partyHp = G.battleParty.map(m => m.currentHp);
  let eHp       = enemy.maxHp;
  let turns     = 0;
  let flawless  = true;
  let elemAdv   = false;
  const log     = [];

  function refreshBattleGraphics() {
    showBattleGraphics(enemy, eHp, partyHp);
  }

  function showBattleStatus() {
    clearScreen();
    refreshBattleGraphics();
    print();
    print(`  ─ ターン ${turns + 1} ─`, 'mid');
    print();
    for (let i = 0; i < G.battleParty.length; i++) {
      const m  = G.battleParty[i];
      const ko = partyHp[i] <= 0 ? '  【KO】' : '';
      const arrow = i === 0 ? '▶' : ' ';
      print(`  ${arrow} ${m.name} [${m.rarity()}] Lv${m.level}${ko}`);
    }
  }

  while (G.battleParty.some((_, i) => partyHp[i] > 0) && eHp > 0) {
    showBattleStatus();
    const choice = await menu('どうする？', ['たたかう！', 'にげる']);

    if (choice === 1) {
      for (let i = 0; i < G.battleParty.length; i++) G.battleParty[i].currentHp = partyHp[i];
      clearScreen();
      print();
      print('  うまく にげられた！');
      for (const m of G.battleParty) m.heal();
      print('  （パーティは ひとやすみして HPが かいふくした）');
      await pause();
      return;
    }

    turns++;
    const roundMsgs = [];

    const actors = G.battleParty
      .map((m, i) => partyHp[i] > 0 ? ['p', i, m.spd] : null)
      .filter(Boolean);
    actors.push(['e', -1, enemy.spd]);
    actors.sort((a, b) => b[2] - a[2]);

    for (const [kind, ai] of actors) {
      if (eHp <= 0) break;
      if (kind === 'p') {
        if (partyHp[ai] <= 0) continue;
        const m   = G.battleParty[ai];
        const pm  = elemMult(m.elem(), enemy.elem());
        if (pm > 1.0) elemAdv = true;
        const dmg = Math.max(1, Math.floor(m.atk * pm) - Math.floor(enemy.def_ / 2));
        eHp = Math.max(0, eHp - dmg);
        const adv = pm > 1.0 ? ' ★ぞくせいゆうり！' : '';
        roundMsgs.push(`  ${m.name} → ${enemy.name}  ${dmg}ダメージ！${adv}`);
      } else {
        const alive = partyHp.map((hp, i) => hp > 0 ? i : -1).filter(i => i >= 0);
        if (!alive.length) break;
        const ti  = pickRnd(alive);
        const tgt = G.battleParty[ti];
        const em  = elemMult(enemy.elem(), tgt.elem());
        const dmg = Math.max(1, Math.floor(enemy.atk * em) - Math.floor(tgt.def_ / 2));
        partyHp[ti] = Math.max(0, partyHp[ti] - dmg);
        flawless = false;
        roundMsgs.push(`  ${enemy.name} → ${tgt.name}  ${dmg}ダメージ！`);
      }
    }

    // ラウンド結果
    clearScreen();
    refreshBattleGraphics();
    print();
    for (const msg of roundMsgs) print(msg);
    log.push(...roundMsgs);
    print();
    for (let i = 0; i < G.battleParty.length; i++) {
      const m  = G.battleParty[i];
      const ko = partyHp[i] <= 0 ? ' 【KO】' : '';
      print(`  ${m.name}  HP:${partyHp[i]}/${m.maxHp}${ko}`);
    }
    print(`  ${enemy.name}  HP:${eHp}/${enemy.maxHp}`);

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
      for (const msg of m.gainExp(exp)) print(msg, 'bright');
    }
  } else {
    print('  ……たおれてしまった', 'dim');
  }

  for (const m of G.battleParty) m.heal();
  print('  （パーティは ひとやすみして HPが かいふくした）', 'dim');
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
  print(`  「${enemy.name}」が なかまに なりたそうに こちらを みている！`, 'bright');
  print();

  const idx = await menu('なかまにする？', ['はい！', 'いいえ']);
  if (idx === 1) {
    print(`\n  「${enemy.name}」は さっていった。`);
    await pause();
    return;
  }

  enemy.heal();
  unlock(enemy.chars);
  G.monsters.push(enemy);
  print(`\n  「${enemy.name}」が なかまに なった！`, 'bright');
  print(`  所持モンスター: ${G.monsters.length}体`);

  if (G.battleParty.length < BATTLE_MAX) {
    G.battleParty.push(enemy);
    print(`  戦闘パーティに くわわった！  (${G.battleParty.length}/${BATTLE_MAX}体)`);
  } else {
    print('  ※ 戦闘パーティが いっぱいです。', 'dim');
  }
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
  print(`  「${monster.name}」が レベル ${monster.level} に なった！`);
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
    print(`  「${newName}」に しんかした！`, 'bright');
    print(`  [${monster.rarity()}]  ${ELEM_JP[monster.elem()]}属性  Lv${monster.level}`);
  } else {
    print('\n  ひらめきは きえていった……', 'dim');
  }
  await pause();
}

// ===================================================
// ===== なかまメニュー =====
// ===================================================
async function partyMenu() {
  while (true) {
    clearScreen();
    print();
    print(`  ＜戦闘パーティ＞  (${G.battleParty.length}/${BATTLE_MAX}体)`, 'bright');
    print();
    for (let i = 0; i < G.battleParty.length; i++) {
      const m    = G.battleParty[i];
      const mark = i === 0 ? '▶' : '  ';
      print(`  ${mark} ${m.name} [${m.rarity()}] Lv${m.level}  HP:${m.currentHp}/${m.maxHp}`);
    }

    const box = G.monsters.filter(m => !G.battleParty.includes(m));
    if (box.length) {
      print();
      print(`  ＜ボックス＞  (${box.length}体)`, 'mid');
      for (const m of box) print(`     ${m.name} [${m.rarity()}] Lv${m.level}`);
    }
    print();

    const idx = await menu('操作', ['メンバーへんこう', 'くわしくみる', '配合する', 'もどる']);
    if      (idx === 0) await editBattleParty();
    else if (idx === 1) await detailView();
    else if (idx === 2) await breed();
    else break;
  }
}

async function pickMonster(prompt, exclude = null) {
  const cands = G.monsters.filter(m => m !== exclude);
  if (!cands.length) return null;
  const labels = cands.map(m => `${m.name} [${m.rarity()}] Lv${m.level}`);
  const idx = await menu(prompt, labels);
  return cands[idx];
}

async function editBattleParty() {
  clearScreen();
  print();
  print(`  ＜戦闘パーティ＞  (${G.battleParty.length}/${BATTLE_MAX}体)`, 'bright');
  for (const m of G.battleParty) print(`    ${m.name} [${m.rarity()}] Lv${m.level}`);

  const box = G.monsters.filter(m => !G.battleParty.includes(m));
  if (box.length) {
    print('\n  ＜ボックス＞', 'mid');
    for (const m of box) print(`    ${m.name} [${m.rarity()}] Lv${m.level}`);
  }
  print();

  const idx = await menu('どうする？', ['パーティに くわえる', 'パーティから はずす', 'もどる']);
  if (idx === 0) {
    if (G.battleParty.length >= BATTLE_MAX) {
      print(`\n  パーティが いっぱいです（最大${BATTLE_MAX}体）`);
      await pause();
      return;
    }
    if (!box.length) {
      print('\n  ボックスに モンスターが いません。');
      await pause();
      return;
    }
    const labels = box.map(m => `${m.name} [${m.rarity()}] Lv${m.level}`);
    const bi = await menu('パーティに くわえる', labels);
    G.battleParty.push(box[bi]);
    print(`\n  「${box[bi].name}」が 戦闘パーティに くわわった！`);
    await pause();
  } else if (idx === 1) {
    if (G.battleParty.length <= 1) {
      print('\n  パーティに 1体は いないと いけません。');
      await pause();
      return;
    }
    const labels = G.battleParty.map(m => `${m.name} [${m.rarity()}] Lv${m.level}`);
    const bi = await menu('パーティから はずす', labels);
    const m = G.battleParty.splice(bi, 1)[0];
    print(`\n  「${m.name}」を パーティから はずした。`);
    await pause();
  }
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
  print(`  ${p1.name}  ×  ${p2.name}`, 'bright');
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
  const childLv  = Math.max(1, Math.floor((p1.level + p2.level) / 4));
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
  print(`  「${newName}」が うまれた！`, 'bright');
  print(`  [${child.rarity()}]  ${ELEM_JP[child.elem()]}属性  Lv${child.level}`);
  print();
  print(`  ※「${p1.name}」と「${p2.name}」は 旅立った……`, 'dim');
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
  saveGame(idx + 1);
  print(`\n  スロット${idx+1} に きろくした！`, 'bright');
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
  const recipes = {};
  for (const [key, out] of Object.entries(G.inspMap)) {
    (recipes[out] = recipes[out] || []).push(key.split('|'));
  }

  function charFmt(ch) {
    const cd  = G.allChars[ch] || {};
    const rar = cd.rarity || '?';
    const m   = G.unlocked[ch] ? '★' : ' ';
    return `${m}${ch}[${rar}]`;
  }

  const lines = [];
  function collect(outCh, pfx, visited, depth) {
    if (!recipes[outCh] || depth > 3) return;
    const recs = recipes[outCh];
    recs.forEach((inputs, ri) => {
      const lastR = ri === recs.length - 1;
      lines.push(`${pfx}${lastR ? '└─(' : '├─('}${inputs.join(' + ')})`);
      const cpfx = pfx + (lastR ? '   ' : '│  ');
      const newVis = new Set([...visited, outCh]);
      inputs.forEach((inp, ii) => {
        const lastI = ii === inputs.length - 1;
        lines.push(`${cpfx}${lastI ? '└─' : '├─'}${charFmt(inp)}`);
        const ipfx = cpfx + (lastI ? '   ' : '│  ');
        if (recipes[inp] && !newVis.has(inp)) collect(inp, ipfx, newVis, depth + 1);
        else if (recipes[inp] && newVis.has(inp)) lines.push(`${ipfx}└─ ※循環`);
      });
    });
  }

  const sortedOuts = Object.keys(recipes).sort((a, b) => {
    const ra = (G.allChars[a] || {}).rarity || 'N';
    const rb = (G.allChars[b] || {}).rarity || 'N';
    return (RARITY_ORDER[rb] || 0) - (RARITY_ORDER[ra] || 0);
  });

  for (const outCh of sortedOuts) {
    const cd  = G.allChars[outCh] || {};
    const rar = cd.rarity || '?';
    const m   = G.unlocked[outCh] ? ' ★' : '';
    lines.push('');
    lines.push(`${outCh} [${rar}]${m}`);
    collect(outCh, '', new Set([outCh]), 0);
  }

  const PAGE = 18;
  let pageLines = [...lines];

  async function showPage() {
    while (pageLines.length > 0) {
      clearScreen();
      print('\n  ■ ひらめきマップ', 'bright');
      print(`  ★=解禁済み   全${Object.keys(G.inspMap).length}件`);
      print();
      const chunk = pageLines.splice(0, PAGE);
      for (const line of chunk) print(`  ${line}`);
      if (pageLines.length > 0) {
        const c = await menu('', ['続きを見る', '終了']);
        if (c === 1) return;
      } else {
        await pause();
      }
    }
  }
  await showPage();
}

// ===== エントリポイント =====
window.addEventListener('DOMContentLoaded', () => {
  initData();
  gameStart();
});
