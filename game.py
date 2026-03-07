#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
文字モンスター育成RPG - CUIプロトタイプ v3
"""
import json
import random
import os
import sys
import pathlib
import datetime
from dataclasses import dataclass, field
from typing import Optional

# ===== データロード =====

def load_kanji(path: str) -> dict:
    chars = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                d = json.loads(line)
                chars[d['char']] = d
    return chars

def load_insp(path: str) -> dict:
    """ひらめきマッピングをdictで返す。key = '|'.join(sorted(chars))"""
    result: dict = {}
    with open(path, encoding='utf-8') as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            parts = d['input'].split('|')
            key   = '|'.join(sorted(parts))
            if key != d['input']:
                print(f'  [警告] line{lineno}: "{d["input"]}" → 正規化 "{key}"')
            if key in result:
                raise ValueError(f'inspiration_mapping 重複キー: "{key}" (line {lineno})')
            result[key] = d['output']
    return result

# ===== 定数 =====

ELEM_JP = {
    'fire':'火', 'water':'水', 'thunder':'雷', 'ice':'氷',
    'earth':'土', 'wind':'風', 'light':'光', 'dark':'闇', 'neutral':'無',
}

ELEM_ADV = {
    'fire':    ['wind','ice'],
    'water':   ['fire','thunder'],
    'thunder': ['water','wind'],
    'ice':     ['earth','wind'],
    'earth':   ['thunder','light'],
    'wind':    ['earth','dark'],
    'light':   ['dark'],
    'dark':    ['light'],
}

RARITY_ORDER   = {'N':1, 'R':2, 'SR':3, 'SSR':4}
RARITY_RECRUIT = {'N':1.2, 'R':1.0, 'SR':0.7, 'SSR':0.4}

# 合計レベルごとのレア度重み [N, R, SR, SSR]
def rarity_weights(total_lv: int) -> list:
    if total_lv <=  3: return [95,  5,  0,  0]
    if total_lv <=  8: return [80, 18,  2,  0]
    if total_lv <= 15: return [65, 28,  6,  1]
    if total_lv <= 25: return [45, 35, 16,  4]
    if total_lv <= 40: return [30, 35, 25, 10]
    return                    [20, 30, 35, 15]

RARITY_LIST = ['N', 'R', 'SR', 'SSR']

# 位置重み: 1文字目=攻撃, 2文字目=防御, 3文字目=速度
POS_W = [
    {'hp':1.0, 'atk':1.5, 'def':1.0, 'spd':0.8},
    {'hp':1.2, 'atk':0.8, 'def':1.5, 'spd':1.0},
    {'hp':1.0, 'atk':1.0, 'def':0.8, 'spd':1.5},
]

BATTLE_MAX = 3   # 戦闘に連れていける最大数
SEP      = '─' * 40
SAVE_DIR = pathlib.Path(__file__).parent / 'saves'
SLOTS    = 3

# ===== モンスター =====

@dataclass
class Monster:
    name: str
    chars: list           # list of char dict
    level: int = 1
    exp: int = 0
    current_hp: int = 0
    max_hp: int = 0
    atk: int = 0
    def_: int = 0
    spd: int = 0
    parents: list = field(default_factory=list)
    grandparents: list = field(default_factory=list)
    inspiration_used: bool = False

    def calc(self):
        hp = atk = def_ = spd = 0
        for i, ch in enumerate(self.chars):
            w = POS_W[min(i, 2)]
            hp   += ch['hp']  * w['hp']
            atk  += ch['atk'] * w['atk']
            def_ += ch['def'] * w['def']
            spd  += ch['spd'] * w['spd']
        sc = 1 + (self.level - 1) * 0.12
        self.max_hp = max(5,  int(hp   * sc) + self.level * 3)
        self.atk    = max(1,  int(atk  * sc) + self.level)
        self.def_   = max(1,  int(def_ * sc) + self.level)
        self.spd    = max(1,  int(spd  * sc) + self.level)
        self.current_hp = self.max_hp

    def heal(self, amount: Optional[int] = None):
        if amount is None:
            self.current_hp = self.max_hp
        else:
            self.current_hp = min(self.max_hp, self.current_hp + amount)

    def elem(self) -> str:
        if not self.chars: return 'neutral'
        els = [c['element'] for c in self.chars]
        return max(set(els), key=els.count)

    def rarity(self) -> str:
        if not self.chars: return 'N'
        return max((c['rarity'] for c in self.chars), key=lambda r: RARITY_ORDER[r])

    def exp_need(self) -> int:
        return self.level * 12

    def gain_exp(self, amount: int) -> list:
        msgs = []
        self.exp += amount
        while self.exp >= self.exp_need():
            self.exp -= self.exp_need()
            self.level += 1
            old = self.max_hp
            self.calc()
            self.current_hp = min(self.current_hp + (self.max_hp - old), self.max_hp)
            msgs.append(f'  {self.name} は レベル {self.level} に あがった！')
        return msgs

    def hp_bar(self, width: int = 10) -> str:
        ratio = self.current_hp / self.max_hp if self.max_hp else 0
        filled = int(ratio * width)
        return '[' + '■' * filled + '□' * (width - filled) + ']'

    def status(self) -> str:
        """属性なし・レア度あり（通常表示用）"""
        rar = self.rarity()
        return (f'【{self.name}】[{rar}] Lv{self.level}  '
                f'HP {self.hp_bar()} {self.current_hp}/{self.max_hp}')

    def full_status(self) -> list:
        """詳細表示（属性あり）"""
        ej  = ELEM_JP.get(self.elem(), '?')
        rar = self.rarity()
        lines = [
            f'  名前    : {self.name}',
            f'  レベル  : {self.level}  (EXP {self.exp}/{self.exp_need()})',
            f'  属性    : {ej}',
            f'  レア度  : {rar}',
            f'  HP      : {self.current_hp}/{self.max_hp}',
            f'  こうげきりょく : {self.atk}',
            f'  ぼうぎょりょく : {self.def_}',
            f'  すばやさ       : {self.spd}',
        ]
        if self.parents:
            lines.append(f'  親      : {" / ".join(self.parents)}')
        if self.grandparents:
            lines.append(f'  祖父母  : {" / ".join(self.grandparents)}')
        lines.append(f'  ─ 構成文字 ─')
        pos_label = ['1文字目（攻撃寄り）', '2文字目（防御寄り）', '3文字目（速度寄り）']
        for i, ch in enumerate(self.chars):
            ej2 = ELEM_JP.get(ch['element'], '?')
            lbl = pos_label[i] if i < 3 else ''
            lines.append(f'    [{ch["char"]}] {lbl}  {ej2}属性 / {ch["rarity"]}')
        return lines

# ===== UI =====

def clear():
    os.system('cls' if os.name == 'nt' else 'clear')

def pause():
    input('\n  Enterキーで続ける...')

def header():
    print('═' * 40)
    print('   文字モンスター育成RPG')
    print('═' * 40)

def menu(title: str, choices: list) -> int:
    """未入力は 0（先頭）扱い"""
    print(f'\n  {title}')
    for i, c in enumerate(choices, 1):
        print(f'   {i}. {c}')
    while True:
        inp = input('  > ').strip()
        if inp == '':
            return 0
        if inp.isdigit():
            idx = int(inp) - 1
            if 0 <= idx < len(choices):
                return idx
        print('  ※ 番号を入力してください')

def pick_from(monsters: list, prompt: str, exclude: Optional['Monster'] = None) -> Optional['Monster']:
    cands = [m for m in monsters if m is not exclude]
    if not cands:
        return None
    labels = [f'{m.name} [{m.rarity()}] Lv{m.level}  HP:{m.current_hp}/{m.max_hp}' for m in cands]
    return cands[menu(prompt, labels)]

def show_char_list(chars: list, selected: list = None):
    """番号付きで文字一覧を表示。selected に含まれる文字は★マーク"""
    selected = selected or []
    print()
    for j, ch in enumerate(chars):
        ej   = ELEM_JP.get(ch['element'], '?')
        mark = '★' if ch in selected else '  '
        print(f'  {mark}{j+1:2}.[{ch["char"]}]{ej}/{ch["rarity"]}', end='')
        if (j + 1) % 4 == 0:
            print()
    print()

def pick_chars(prompt: str, pool: list, max_len: int = 3) -> list:
    """番号入力で文字を選ぶ。選んだ順が名前の順序。空Enterで確定。"""
    while True:
        chosen: list = []
        print(f'\n  {prompt}  （最大{max_len}文字、選んだ順が名前の順番）')
        show_char_list(pool)
        print('  番号を1つずつ入力。空Enterで確定。')

        while len(chosen) < max_len:
            inp = input(f'  {len(chosen)+1}文字目 > ').strip()
            if inp == '':
                if chosen:
                    break
                print('  ※ 1文字以上　えらんでください')
                continue
            if inp.isdigit():
                ni = int(inp) - 1
                if 0 <= ni < len(pool):
                    ch = pool[ni]
                    if ch in chosen:
                        print('  ※ すでに選ばれています')
                    else:
                        chosen.append(ch)
                        print(f'     → [{ch["char"]}]')
                else:
                    print(f'  ※ 1〜{len(pool)} を入力してください')
            else:
                print('  ※ 番号を入力してください')

        if not chosen:
            continue
        name = ''.join(c['char'] for c in chosen)
        print(f'\n  「{name}」  でよいですか？')
        if menu('', ['はい', 'やりなおす']) == 0:
            return chosen

def ask_name(prompt: str, pool: list, max_len: int = 3) -> list:
    cmap = {c['char']: c for c in pool}
    print(f'\n  {prompt}')
    print(f'  （1〜{max_len}文字、同じ文字は使えません）')
    show_char_list(pool)
    while True:
        inp = input('  名前 > ').strip()
        if not inp:
            print('  ※ 入力してください')
            continue
        if len(inp) > max_len:
            print(f'  ※ {max_len}文字以内にしてください')
            continue
        if len(inp) != len(set(inp)):
            print('  ※ 同じ文字は使えません')
            continue
        bad = [ch for ch in inp if ch not in cmap]
        if bad:
            print(f'  ※ 使えない文字があります: {"".join(bad)}')
            continue
        return [cmap[ch] for ch in inp]

# ===== 戦闘 =====

def _elem_mult(ae: str, de: str) -> float:
    if de in ELEM_ADV.get(ae, []):  return 1.5
    if ae in ELEM_ADV.get(de, []):  return 0.7
    return 1.0

def battle(party: list, enemy: Monster) -> dict:
    """パーティ全員 vs 敵のオートバトル"""
    party_hp  = [m.current_hp for m in party]
    e_hp      = enemy.max_hp
    log       = []
    turns     = 0
    flawless  = True
    elem_adv  = False

    while any(hp > 0 for hp in party_hp) and e_hp > 0 and turns < 30:
        turns += 1

        # 速度順に行動順を決める（パーティ生存メンバー＋敵）
        actors = []
        for i, m in enumerate(party):
            if party_hp[i] > 0:
                actors.append(('p', i, m.spd))
        actors.append(('e', -1, enemy.spd))
        actors.sort(key=lambda x: x[2], reverse=True)

        for kind, idx, _ in actors:
            if e_hp <= 0:
                break
            if kind == 'p':
                if party_hp[idx] <= 0:
                    continue
                m  = party[idx]
                pm = _elem_mult(m.elem(), enemy.elem())
                if pm > 1.0:
                    elem_adv = True
                dmg = max(1, int(m.atk * pm) - enemy.def_ // 2)
                e_hp = max(0, e_hp - dmg)
                log.append(f'  {m.name} の こうげき！  {enemy.name} に {dmg} ダメージ！')
            else:
                alive = [i for i, hp in enumerate(party_hp) if hp > 0]
                if not alive:
                    break
                ti  = random.choice(alive)
                tgt = party[ti]
                em  = _elem_mult(enemy.elem(), tgt.elem())
                dmg = max(1, int(enemy.atk * em) - tgt.def_ // 2)
                party_hp[ti] = max(0, party_hp[ti] - dmg)
                flawless = False
                log.append(f'  {enemy.name} の こうげき！  {tgt.name} に {dmg} ダメージ！')

        if all(hp <= 0 for hp in party_hp):
            break

    won = e_hp <= 0 and any(hp > 0 for hp in party_hp)
    bm  = 1.0
    if won:
        if turns <= 3:   bm *= 1.2
        if flawless:     bm *= 1.3
        if elem_adv:     bm *= 1.1
        avg_lv = sum(m.level for m in party) / len(party)
        if avg_lv > enemy.level + 3: bm *= 0.8

    return {
        'won': won, 'turns': turns,
        'party_hp_left': party_hp,
        'log': log, 'battle_mult': bm,
        'elem_adv': elem_adv, 'flawless': flawless,
    }

def recruit_chance(enemy: Monster, br: dict) -> float:
    base = 0.3
    rm   = RARITY_RECRUIT.get(enemy.rarity(), 1.0)
    return min(0.90, max(0.02, base * rm * br['battle_mult']))

# ===== ひらめき =====

def check_insp(monster: Monster, insp_map: dict) -> Optional[str]:
    """
    Lv20達成 & 未使用のとき発動を試みる。
    3文字名: 完全3文字一致 → なければ2文字サブセット (0,1)→(0,2)→(1,2) 順に探す
    1〜2文字名: そのまま一致
    """
    if monster.inspiration_used or monster.level < 20:
        return None
    chars = [c['char'] for c in monster.chars]

    def lookup(subset: list) -> Optional[str]:
        return insp_map.get('|'.join(sorted(subset)))

    # 全文字で完全一致
    result = lookup(chars)
    if result:
        return result

    # 3文字名のとき2文字サブセットにフォールバック
    if len(chars) == 3:
        for i, j in [(0, 1), (0, 2), (1, 2)]:
            result = lookup([chars[i], chars[j]])
            if result:
                return result

    return None

# ===== データ検証 =====

def validate_data(all_chars: dict, insp_map: dict):
    errors = []
    for key, output in insp_map.items():
        for ch in key.split('|'):
            if ch not in all_chars:
                errors.append(f'  mapping "{key}": 入力文字 "{ch}" が kanji_master に存在しません')
        if output not in all_chars:
            errors.append(f'  mapping "{key}": 出力文字 "{output}" が kanji_master に存在しません')
    if errors:
        print('\n  [データ検証エラー]')
        for e in errors:
            print(e)
        sys.exit(1)

# ===== セーブ/ロード =====

def _monster_to_dict(m: Monster) -> dict:
    return {
        'name': m.name,
        'chars': m.chars,
        'level': m.level,
        'exp': m.exp,
        'current_hp': m.current_hp,
        'max_hp': m.max_hp,
        'atk': m.atk,
        'def_': m.def_,
        'spd': m.spd,
        'parents': m.parents,
        'grandparents': m.grandparents,
        'inspiration_used': m.inspiration_used,
    }

def _dict_to_monster(d: dict) -> Monster:
    m = Monster(
        name=d['name'], chars=d['chars'],
        level=d['level'], exp=d['exp'],
        current_hp=d['current_hp'], max_hp=d['max_hp'],
        atk=d['atk'], def_=d['def_'], spd=d['spd'],
        parents=d['parents'], grandparents=d['grandparents'],
        inspiration_used=d['inspiration_used'],
    )
    return m

def save_slot_path(slot: int) -> pathlib.Path:
    SAVE_DIR.mkdir(exist_ok=True)
    return SAVE_DIR / f'slot_{slot}.json'

def save_game(game, slot: int):
    bp_indices = [game.monsters.index(m) for m in game.battle_party]
    data = {
        'saved_at': datetime.datetime.now().strftime('%Y/%m/%d %H:%M'),
        'unlocked': game.unlocked,
        'monsters': [_monster_to_dict(m) for m in game.monsters],
        'battle_party_indices': bp_indices,
    }
    with open(save_slot_path(slot), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_game(game, slot: int) -> bool:
    path = save_slot_path(slot)
    if not path.exists():
        return False
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    game.unlocked      = data['unlocked']
    game.monsters      = [_dict_to_monster(d) for d in data['monsters']]
    game.battle_party  = [game.monsters[i] for i in data['battle_party_indices']]
    return True

def slot_info(slot: int) -> str:
    """スロットの概要文字列を返す（空なら '(空)'）"""
    path = save_slot_path(slot)
    if not path.exists():
        return '(空)'
    try:
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        leader = d['monsters'][d['battle_party_indices'][0]]
        mons   = len(d['monsters'])
        saved  = d.get('saved_at', '??')
        return f'{leader["name"]} Lv{leader["level"]}  なかま{mons}体  {saved}'
    except Exception:
        return '(読み込みエラー)'

# ===== ゲーム =====

class Game:
    def __init__(self, kanji_path: str, insp_path: str):
        print('  データ読み込み中...')
        self.all_chars: dict    = load_kanji(kanji_path)
        self.insp_map:  dict    = load_insp(insp_path)
        validate_data(self.all_chars, self.insp_map)
        self.unlocked:      dict = {}
        self.monsters:      list = []
        self.battle_party:  list = []
        self.last_battle_log: list = []     # 直近バトルログ（行リスト）

    @property
    def leader(self) -> Optional[Monster]:
        return self.battle_party[0] if self.battle_party else None

    def _total_lv(self) -> int:
        return sum(m.level for m in self.battle_party) or 1

    def _unlock(self, chars: list):
        for ch in chars:
            self.unlocked[ch['char']] = ch

    # ── 起動 ──────────────────────────────────

    def start(self):
        clear()
        header()
        print("""
  文字には力が宿る。
  カンジの力を持つモンスターを育て、世界を旅しよう。
""")
        idx = menu('', ['はじめから', 'ぼうけんのしょをよむ'])
        if idx == 1:
            loaded = self._load_menu(from_title=True)
            if not loaded:
                return   # タイトルに戻る（再帰しない、再起動扱い）
        else:
            self._create_starter()
        self._main_loop()

    def _create_starter(self):
        """Rレア2文字をランダムに選び、自動命名してスタート"""
        r_chars = [v for v in self.all_chars.values() if v['rarity'] == 'R']
        chosen  = random.sample(r_chars, min(2, len(r_chars)))
        self._unlock(chosen)

        name = ''.join(c['char'] for c in chosen)
        m = Monster(name=name, chars=chosen)
        m.calc()
        self.monsters.append(m)
        self.battle_party.append(m)

        clear()
        header()
        print(f'\n  あなたの最初のモンスター：\n')
        print(f'  {m.status()}')
        pause()

    # ── メインループ ───────────────────────────

    def _main_loop(self):
        while True:
            clear()
            header()
            m = self.leader
            print(f'\n  {m.status()}')
            print(f'  戦闘パーティ: {len(self.battle_party)}/{BATTLE_MAX}体  '
                  f'所持: {len(self.monsters)}体')
            print()

            idx = menu('コマンド', ['ぼうけん', 'なかま', 'ずかん', 'ぼうけんのしょ', 'やめる'])
            if   idx == 0: self._explore()
            elif idx == 1: self._party_menu()
            elif idx == 2: self._zukan()
            elif idx == 3: self._book_menu()
            elif idx == 4:
                print('\n  またね！\n')
                break

    # ── 探索 ──────────────────────────────────

    def _explore(self):
        clear()
        header()
        names = '  '.join(m.name for m in self.battle_party)
        print(f'\n  {names}　たちは　ぼうけんに　でかけた……\n')
        pause()

        enemy = self._wild_enemy()
        rar   = enemy.rarity()

        print(f'\n  やせいの　「{enemy.name}」[{rar}]が あらわれた！\n')

        idx = menu('どうする？', ['たたかう', 'にげる'])
        if idx == 1:
            print('\n  うまく にげられた！')
            pause()
            return

        self._do_battle(enemy)

    def _wild_enemy(self) -> Monster:
        total = self._total_lv()
        size  = len(self.battle_party) or 1

        # レア度は合計レベルの進捗で決める
        weights    = rarity_weights(total)
        chosen_rar = random.choices(RARITY_LIST, weights=weights, k=1)[0]
        pool = [v for v in self.all_chars.values() if v['rarity'] == chosen_rar]
        if not pool:
            pool = list(self.all_chars.values())

        # 文字数 1〜3
        n      = random.choices([1, 2, 3], weights=[2, 4, 4])[0]
        chosen = random.sample(pool, min(n, len(pool)))

        # 敵レベル: パーティ平均レベル基準。
        #   人数補正は控えめ（+10%/人）にする。
        #   旧：avg × √size（3人でLv×1.73→高Lvで1撃KO多発）
        #   新：avg × (1 + 0.1×(size-1))（3人でLv×1.2 程度）
        avg_lv    = total / size
        size_mult = 1 + 0.1 * (size - 1)   # 1人:×1.0  2人:×1.1  3人:×1.2
        base_lv   = max(1, avg_lv * size_mult)
        lv = max(1, int(base_lv * random.uniform(0.85, 1.15)))

        e = Monster(name=''.join(c['char'] for c in chosen), chars=chosen, level=lv)
        e.calc()

        # レア度による攻防速補正（同レベルでも N=弱め、SSR=強め）
        RARITY_MULT = {'N': 0.80, 'R': 1.00, 'SR': 1.15, 'SSR': 1.35}
        rm = RARITY_MULT.get(chosen_rar, 1.0)
        if rm != 1.0:
            e.atk  = max(1, int(e.atk  * rm))
            e.def_ = max(1, int(e.def_ * rm))
            e.spd  = max(1, int(e.spd  * rm))

        return e

    # ── 戦闘 ──────────────────────────────────

    def _do_battle(self, enemy: Monster):
        """インタラクティブターン制バトル"""
        party_hp = [m.current_hp for m in self.battle_party]
        e_hp     = enemy.max_hp
        log      = []
        turns    = 0
        flawless = True
        elem_adv = False

        def make_bar(cur: int, mx: int, width: int = 10) -> str:
            ratio  = max(0.0, cur / mx) if mx else 0.0
            filled = int(ratio * width)
            return '[' + '■' * filled + '□' * (width - filled) + ']'

        def show_status():
            clear()
            header()
            print(f'\n  ─ ターン {turns + 1} ─\n')
            for i, m in enumerate(self.battle_party):
                ko  = ' 【KO】' if party_hp[i] <= 0 else ''
                bar = make_bar(party_hp[i], m.max_hp)
                print(f'  {m.name}[{m.rarity()}]  HP {bar}  {party_hp[i]}/{m.max_hp}{ko}')
            print()
            e_bar = make_bar(e_hp, enemy.max_hp)
            print(f'  てき: {enemy.name}[{enemy.rarity()}]  HP {e_bar}')
            print()

        while any(hp > 0 for hp in party_hp) and e_hp > 0:
            show_status()
            choice = menu('どうする？', ['たたかう', 'にげる'])

            if choice == 1:
                for i, m in enumerate(self.battle_party):
                    m.current_hp = party_hp[i]
                clear()
                header()
                print('\n  うまく にげられた！')
                for m in self.battle_party:
                    m.heal()
                print('  （パーティは　ひとやすみして　HPが　かいふくした）')
                pause()
                return

            turns += 1
            round_msgs = []

            # 速度順ターン解決
            actors = [('p', i, m.spd)
                      for i, m in enumerate(self.battle_party)
                      if party_hp[i] > 0]
            actors.append(('e', -1, enemy.spd))
            actors.sort(key=lambda x: x[2], reverse=True)

            for kind, ai, _ in actors:
                if e_hp <= 0:
                    break
                if kind == 'p':
                    if party_hp[ai] <= 0:
                        continue
                    m   = self.battle_party[ai]
                    pm  = _elem_mult(m.elem(), enemy.elem())
                    if pm > 1.0:
                        elem_adv = True
                    dmg  = max(1, int(m.atk * pm) - enemy.def_ // 2)
                    e_hp = max(0, e_hp - dmg)
                    adv  = ' ぞくせいゆうり！' if pm > 1.0 else ''
                    round_msgs.append(
                        f'  {m.name} の こうげき！  {enemy.name} に {dmg} ダメージ！{adv}')
                else:
                    alive = [j for j, hp in enumerate(party_hp) if hp > 0]
                    if not alive:
                        break
                    ti  = random.choice(alive)
                    tgt = self.battle_party[ti]
                    em  = _elem_mult(enemy.elem(), tgt.elem())
                    dmg = max(1, int(enemy.atk * em) - tgt.def_ // 2)
                    party_hp[ti] = max(0, party_hp[ti] - dmg)
                    flawless = False
                    round_msgs.append(
                        f'  {enemy.name} の こうげき！  {tgt.name} に {dmg} ダメージ！')

            # ラウンド結果表示
            clear()
            header()
            print()
            for msg in round_msgs:
                print(msg)
            log.extend(round_msgs)

            # 更新後HPバー
            print(f'\n  {SEP}')
            for i, m in enumerate(self.battle_party):
                ko  = ' 【KO】' if party_hp[i] <= 0 else ''
                bar = make_bar(party_hp[i], m.max_hp)
                print(f'  {m.name}[{m.rarity()}]  HP {bar}  {party_hp[i]}/{m.max_hp}{ko}')
            e_bar = make_bar(e_hp, enemy.max_hp)
            print(f'  てき  {enemy.name}[{enemy.rarity()}]  HP {e_bar}')

            if any(hp > 0 for hp in party_hp) and e_hp > 0:
                pause()

        # ── 戦闘終了 ──
        won = e_hp <= 0 and any(hp > 0 for hp in party_hp)

        bm = 1.0
        if won:
            if turns <= 3:    bm *= 1.2
            if flawless:      bm *= 1.3
            if elem_adv:      bm *= 1.1
            avg_lv = sum(m.level for m in self.battle_party) / len(self.battle_party)
            if avg_lv > enemy.level + 3: bm *= 0.8

        # ログ保存
        party_str   = '  '.join(f'{m.name}[{m.rarity()}]' for m in self.battle_party)
        header_line = (f'=== {datetime.datetime.now().strftime("%Y/%m/%d %H:%M")} '
                       f'{party_str} vs {enemy.name}[{enemy.rarity()}] ===')
        self.last_battle_log = [header_line] + log
        try:
            SAVE_DIR.mkdir(exist_ok=True)
            (SAVE_DIR / 'last_battle.log').write_text(
                '\n'.join(self.last_battle_log), encoding='utf-8')
        except Exception:
            pass

        # 勝敗メッセージ
        print()
        if won:
            print('  かちだ！')
            if flawless: print('  きずひとつない　かんぜんしょうり！')
            if elem_adv: print('  ぞくせいゆうり！')
            for i, m in enumerate(self.battle_party):
                m.current_hp = party_hp[i]
            exp = enemy.level * 6 + random.randint(1, 6)
            print(f'\n  けいけんちを　{exp}　もらった！')
            for m in self.battle_party:
                for msg in m.gain_exp(exp):
                    print(msg)
        else:
            print('  たおれてしまった……')

        for m in self.battle_party:
            m.heal()
        print('\n  （パーティは　ひとやすみして　HPが　かいふくした）')
        pause()

        if not won:
            return

        # ひらめきチェック（パーティ全員）
        for m in self.battle_party:
            insp = check_insp(m, self.insp_map)
            if insp:
                self._inspiration(m, insp)
                return

        # 勧誘判定
        if random.random() < recruit_chance(enemy, {'battle_mult': bm}):
            self._recruit(enemy)

    # ── 勧誘 ──────────────────────────────────

    def _recruit(self, enemy: Monster):
        clear()
        header()
        rar = enemy.rarity()
        print(f'\n  「{enemy.name}」[{rar}] が なかまに なりたそうに こちらを みている！\n')

        idx = menu('なかまにする？', ['はい', 'いいえ'])
        if idx == 1:
            print(f'\n  「{enemy.name}」は　さっていった。')
            pause()
            return

        enemy.heal()
        self._unlock(enemy.chars)
        self.monsters.append(enemy)
        print(f'\n  「{enemy.name}」が なかまに なった！')
        print(f'  所持モンスター: {len(self.monsters)}体')

        # 戦闘パーティに空きがあれば自動追加
        if len(self.battle_party) < BATTLE_MAX:
            self.battle_party.append(enemy)
            print(f'  戦闘パーティに　くわわった！  ({len(self.battle_party)}/{BATTLE_MAX}体)')
        else:
            print(f'  ※ 戦闘パーティは　いっぱいです。')
            print(f'    「なかま」から　メンバーを　いれかえられます。')
        pause()

    # ── ひらめき ──────────────────────────────

    def _inspiration(self, monster: Monster, new_char: str):
        clear()
        header()
        print(f'\n  ✨ ひらめき！\n')
        print(f'  「{monster.name}」が レベル {monster.level} に なった！')
        print(f'  あたらしい　文字が　かがやいている……\n')
        print(SEP)

        cd = self.all_chars.get(new_char)
        if cd:
            print(f'\n  ★ 新しい文字「{new_char}」  [{cd["rarity"]}]')
        print()

        idx = menu('ひらめきを　つかう？', ['つかう', 'みおくる'])
        monster.inspiration_used = True

        if idx == 0 and cd:
            self._unlock([cd])

            cands: dict = {}
            for pname in (monster.parents + monster.grandparents):
                for ch in pname:
                    if ch in self.all_chars:
                        cands[ch] = self.all_chars[ch]
            for ch in monster.chars:
                cands[ch['char']] = ch
            cands[new_char] = cd
            pool = list(cands.values())

            old_parents = monster.parents[:]
            monster.grandparents = old_parents
            monster.parents = [monster.name]

            print('\n  新しい名前を　つけてあげよう。')
            new_chars = pick_chars('つかえる文字', pool, max_len=3)
            new_name  = ''.join(c['char'] for c in new_chars)

            monster.name  = new_name
            monster.chars = new_chars
            monster.calc()

            print(f'\n  「{new_name}」に　しんかした！')
            print(f'  {monster.status()}')
        else:
            print(f'\n  ひらめきは　きえていった……')
        pause()

    # ── なかまメニュー ─────────────────────────

    def _party_menu(self):
        while True:
            clear()
            header()

            print(f'\n  ＜戦闘パーティ＞  ({len(self.battle_party)}/{BATTLE_MAX}体)\n')
            for i, m in enumerate(self.battle_party):
                mark = '▶' if i == 0 else ' '
                print(f'  {mark} {m.status()}')

            box = [m for m in self.monsters if m not in self.battle_party]
            if box:
                print(f'\n  ＜ボックス＞  ({len(box)}体)\n')
                for m in box:
                    print(f'     {m.status()}')
            print()

            idx = menu('操作', ['せんとうメンバーへんこう', 'くわしくみる', 'はいごう（配合）', 'もどる'])
            if   idx == 0: self._edit_battle_party()
            elif idx == 1: self._detail()
            elif idx == 2: self._breed()
            elif idx == 3: break

    def _edit_battle_party(self):
        """戦闘パーティの編成変更"""
        clear()
        header()
        print(f'\n  ＜戦闘パーティ＞  ({len(self.battle_party)}/{BATTLE_MAX}体)')
        for i, m in enumerate(self.battle_party):
            print(f'    {i+1}. {m.status()}')

        box = [m for m in self.monsters if m not in self.battle_party]
        if box:
            print(f'\n  ＜ボックス＞')
            for m in box:
                print(f'       {m.status()}')

        choices = ['パーティに　くわえる', 'パーティから　はずす', 'もどる']
        idx = menu('どうする？', choices)

        if idx == 0:
            if len(self.battle_party) >= BATTLE_MAX:
                print(f'\n  パーティが　いっぱいです。（最大{BATTLE_MAX}体）')
                pause()
                return
            if not box:
                print('\n  ボックスに　モンスターが　いません。')
                pause()
                return
            m = pick_from(box, 'パーティに　くわえる　モンスターを　えらぶ')
            if m:
                self.battle_party.append(m)
                print(f'\n  「{m.name}」が　戦闘パーティに　くわわった！')
                pause()

        elif idx == 1:
            if len(self.battle_party) <= 1:
                print('\n  パーティに　1体は　いないと　いけません。')
                pause()
                return
            m = pick_from(self.battle_party, 'パーティから　はずす　モンスターを　えらぶ')
            if m:
                self.battle_party.remove(m)
                print(f'\n  「{m.name}」を　パーティから　はずした。')
                pause()

    def _detail(self):
        m = pick_from(self.monsters, 'くわしく　みる　モンスターを　えらぶ')
        if not m: return
        clear()
        header()
        print()
        for line in m.full_status():
            print(line)
        pause()

    # ── 配合 ──────────────────────────────────

    def _breed(self):
        if len(self.monsters) < 2:
            print('\n  モンスターが　2体　いないと　はいごうできない。')
            pause()
            return

        clear()
        header()
        print('\n  ■ 配合\n')
        print('  2体の　モンスターの　文字を　あわせて')
        print('  あたらしい　モンスターを　うみだす。')
        print('  ※ つかった　2体は　いなくなります。\n')

        parent1 = pick_from(self.monsters, '親1を　えらぶ')
        if not parent1: return
        parent2 = pick_from(self.monsters, '親2を　えらぶ', exclude=parent1)
        if not parent2: return

        print(f'\n  親1: {parent1.name} [{parent1.rarity()}]  ×  親2: {parent2.name} [{parent2.rarity()}]')
        if menu('はいごう　する？', ['はい', 'いいえ']) == 1:
            print('  やめた。')
            pause()
            return

        # 使える文字 = 両親＋祖父母の文字（重複なし、出典ラベル付き）
        cands: dict = {}
        for ch in parent1.chars:
            cands[ch['char']] = ch
        for ch in parent2.chars:
            cands[ch['char']] = ch
        for pname in (parent1.parents + parent2.parents)[:4]:
            for c in pname:
                if c in self.all_chars:
                    cands[c] = self.all_chars[c]
        pool = list(cands.values())

        print(f'\n  子どもの　名前を　きめよう。')
        print(f'  （親1「{parent1.name}」＋親2「{parent2.name}」の文字）')
        new_chars = pick_chars('つかえる文字', pool, max_len=3)
        new_name  = ''.join(c['char'] for c in new_chars)

        child_lv = max(1, (parent1.level + parent2.level) // 4)
        child = Monster(
            name=new_name, chars=new_chars, level=child_lv,
            parents=[parent1.name, parent2.name],
            grandparents=(parent1.parents + parent2.parents)[:4],
        )
        child.calc()
        self._unlock(new_chars)

        # 親を削除
        for p in (parent1, parent2):
            if p in self.battle_party:
                self.battle_party.remove(p)
            self.monsters.remove(p)

        self.monsters.append(child)
        # パーティに空きがあれば自動追加
        if len(self.battle_party) < BATTLE_MAX:
            self.battle_party.append(child)

        print(f'\n  「{new_name}」が　うまれた！')
        print(f'  {child.status()}')
        print(f'\n  ※「{parent1.name}」と「{parent2.name}」は　旅立っていった……')
        pause()

    # ── ぼうけんのしょ ────────────────────────

    def _slot_labels(self) -> list:
        return [f'スロット{i+1}:  {slot_info(i+1)}' for i in range(SLOTS)]

    def _book_menu(self):
        while True:
            clear()
            header()
            print('\n  ■ ぼうけんのしょ\n')
            idx = menu('どうする？', ['きろくする（セーブ）', 'よみなおす（ロード）',
                                      'さいきんのたたかい', 'もどる'])
            if   idx == 0: self._save_menu()
            elif idx == 1: self._load_menu(from_title=False)
            elif idx == 2: self._view_log()
            elif idx == 3: break

    def _save_menu(self):
        clear()
        header()
        print('\n  ■ きろくする\n')
        labels = self._slot_labels() + ['もどる']
        idx = menu('どのスロットに　きろくする？', labels)
        if idx == SLOTS:
            return
        slot = idx + 1
        save_game(self, slot)
        print(f'\n  スロット{slot} に　きろくした！')
        pause()

    def _load_menu(self, from_title: bool) -> bool:
        """ロード選択。成功したら True を返す"""
        clear()
        header()
        print('\n  ■ よみなおす\n')
        labels = self._slot_labels() + ['もどる']
        idx = menu('どのスロットを　よむ？', labels)
        if idx == SLOTS:
            return False
        slot = idx + 1
        if slot_info(slot) == '(空)':
            print(f'\n  スロット{slot} は　空です。')
            pause()
            return False
        ok = load_game(self, slot)
        if ok:
            print(f'\n  スロット{slot} を　よみこんだ！')
            if not from_title:
                pause()
        else:
            print(f'\n  よみこみに　しっぱいした。')
            pause()
        return ok

    # ── 図鑑 ──────────────────────────────────

    def _zukan(self):
        while True:
            clear()
            header()
            total = len(self.all_chars)
            have  = len(self.unlocked)
            rar_counts: dict = {'N': 0, 'R': 0, 'SR': 0, 'SSR': 0}
            for m in self.monsters:
                rar_counts[m.rarity()] = rar_counts.get(m.rarity(), 0) + 1
            counts_str = '  '.join(f'{r}:{rar_counts[r]}体' for r in ['N','R','SR','SSR'])

            print(f'\n  ■ ずかん\n')
            print(f'  解禁文字      : {have} / {total}')
            print(f'  所持モンスター: {len(self.monsters)}体')
            print(f'  レア度内訳    : {counts_str}')
            print()

            idx = menu('', ['解禁文字リスト', 'ひらめきマップ', 'もどる'])
            if   idx == 0: self._zukan_chars()
            elif idx == 1: self._insp_tree()
            elif idx == 2: break

    def _zukan_chars(self):
        """解禁文字を属性別に表示"""
        clear()
        header()
        by_elem: dict = {}
        for ch in self.unlocked.values():
            by_elem.setdefault(ch['element'], []).append(ch)
        print(f'\n  ■ 解禁文字リスト  ({len(self.unlocked)}/{len(self.all_chars)})\n')
        print(f'  {SEP}')
        for ek in sorted(by_elem):
            ej = ELEM_JP.get(ek, ek)
            chars_str = '  '.join(f'{c["char"]}({c["rarity"]})' for c in by_elem[ek])
            print(f'  [{ej}]  {chars_str}')
        pause()

    def _insp_tree(self):
        """ひらめきマッピングを出力文字ごとのツリーで表示（未解放含む全量）"""
        # 逆引き: 出力文字 → [[入力char, ...], ...]
        recipes: dict = {}
        for key, out in self.insp_map.items():
            recipes.setdefault(out, []).append(key.split('|'))

        def char_fmt(ch: str) -> str:
            """食材の文字をフォーマット。解禁済みなら★"""
            cd  = self.all_chars.get(ch, {})
            rar = cd.get('rarity', '?')
            m   = '★' if ch in self.unlocked else ' '
            return f'{m}{ch}[{rar}]'

        lines: list = []

        def collect(out_ch: str, pfx: str, visited: frozenset, depth: int):
            """out_ch のレシピ群を lines に追記（再帰）"""
            if out_ch not in recipes or depth > 3:
                return
            ch_recipes = recipes[out_ch]
            for ri, inputs in enumerate(ch_recipes):
                last_r = (ri == len(ch_recipes) - 1)
                lines.append(f'{pfx}{"└─(" if last_r else "├─("}{" + ".join(inputs)})')
                cpfx    = pfx + ('   ' if last_r else '│  ')
                new_vis = visited | {out_ch}
                for ii, inp in enumerate(inputs):
                    last_i = (ii == len(inputs) - 1)
                    lines.append(f'{cpfx}{"└─" if last_i else "├─"}{char_fmt(inp)}')
                    ipfx = cpfx + ('   ' if last_i else '│  ')
                    if inp in recipes and inp not in new_vis:
                        collect(inp, ipfx, new_vis, depth + 1)
                    elif inp in recipes and inp in new_vis:
                        lines.append(f'{ipfx}└─ ※循環')

        # SSR→SR→R→N の順にソート
        sorted_outs = sorted(
            recipes.keys(),
            key=lambda c: -RARITY_ORDER.get(
                self.all_chars.get(c, {}).get('rarity', 'N'), 1)
        )

        for out_ch in sorted_outs:
            cd  = self.all_chars.get(out_ch, {})
            rar = cd.get('rarity', '?')
            # ヘッダー行: 出力文字 [rar]、解禁済みなら末尾に★
            m = ' ★' if out_ch in self.unlocked else ''
            lines.append('')
            lines.append(f'{out_ch} [{rar}]{m}')
            collect(out_ch, '', frozenset({out_ch}), 0)

        # ページング表示
        clear()
        header()
        print('\n  ■ ひらめきマップ  (未解放含む全量)\n')
        print(f'  ★ = 解禁済み文字   全{len(self.insp_map)}件\n')
        print(SEP)

        PAGE = 22
        n = 0
        for line in lines:
            print(f'  {line}')
            n += 1
            if n % PAGE == 0:
                inp = input('\n  ─── Enterで続き、qで終了 ───  ')
                if inp.strip().lower() == 'q':
                    return
                clear()
                header()
                print('\n  ■ ひらめきマップ（続き）\n')
        pause()

    # ── バトルログ閲覧 ────────────────────────

    def _view_log(self):
        clear()
        header()
        print('\n  ■ さいきんのたたかい\n')
        if not self.last_battle_log:
            log_path = SAVE_DIR / 'last_battle.log'
            if log_path.exists():
                try:
                    self.last_battle_log = log_path.read_text(encoding='utf-8').splitlines()
                except Exception:
                    pass
        if not self.last_battle_log:
            print('  まだ　たたかいの　きろくが　ありません。')
        else:
            for line in self.last_battle_log:
                print(line)
        pause()


# ===== エントリーポイント =====

if __name__ == '__main__':
    base = pathlib.Path(__file__).parent
    kp   = base / 'kanji_master_all_with_stats.jsonl'
    ip   = base / 'inspiration_mapping.jsonl'

    if not kp.exists():
        print(f'エラー: {kp} が見つかりません')
        sys.exit(1)

    Game(str(kp), str(ip)).start()
