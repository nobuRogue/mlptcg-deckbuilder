import { type Card, type CardType, isDailyScene, isDeckCard } from './cards'

/** recordId → 枚数 */
export type DeckCards = Record<string, number>

export type SectionKey = 'lead' | 'story' | 'main' | 'scene'

export const SECTIONS: { key: SectionKey; label: string; size: number; types: CardType[] }[] = [
  { key: 'lead', label: '主役', size: 1, types: ['主役'] },
  { key: 'story', label: 'ストーリーデッキ', size: 4, types: ['ストーリー'] },
  { key: 'main', label: 'メインデッキ', size: 50, types: ['キャラ', 'イベント', 'アイテム'] },
  { key: 'scene', label: 'シーンデッキ', size: 15, types: ['シーン'] },
]

export const MAX_COPIES = 4

/** カードが入る区分。トークンなどデッキに入らないカードは null */
export const sectionOf = (c: Card): SectionKey | null => SECTIONS.find((s) => s.types.includes(c.type))?.key ?? null

export interface DeckEntry {
  card: Card
  count: number
}

export function groupBySection(deck: DeckCards, lookup: Map<string, Card>) {
  const groups: Record<SectionKey, DeckEntry[]> = { lead: [], story: [], main: [], scene: [] }
  for (const [rid, count] of Object.entries(deck)) {
    const card = lookup.get(rid)
    const section = card && sectionOf(card)
    if (section && count > 0) groups[section].push({ card, count })
  }
  for (const g of Object.values(groups)) {
    g.sort(
      (a, b) =>
        (a.card.storyStage ?? 0) - (b.card.storyStage ?? 0) ||
        (a.card.harmony ?? 99) - (b.card.harmony ?? 99) ||
        a.card.cardNo.localeCompare(b.card.cardNo),
    )
  }
  return groups
}

export const sectionTotal = (entries: DeckEntry[]) => entries.reduce((n, e) => n + e.count, 0)

/** 同一カードナンバーの合計枚数 */
export function copiesByCardNo(deck: DeckCards, lookup: Map<string, Card>) {
  const m = new Map<string, number>()
  for (const [rid, count] of Object.entries(deck)) {
    const card = lookup.get(rid)
    if (card) m.set(card.cardNo, (m.get(card.cardNo) ?? 0) + count)
  }
  return m
}

/** そのカードをあと1枚追加できるか（枚数制限のみ。区分の上限は超えても追加は許可する） */
export function canAdd(card: Card, deck: DeckCards, lookup: Map<string, Card>) {
  if (!isDeckCard(card)) return false
  if (isDailyScene(card)) return true
  return (copiesByCardNo(deck, lookup).get(card.cardNo) ?? 0) < MAX_COPIES
}

export function validate(deck: DeckCards, lookup: Map<string, Card>): string[] {
  const errors: string[] = []
  const groups = groupBySection(deck, lookup)

  for (const s of SECTIONS) {
    const n = sectionTotal(groups[s.key])
    if (n !== s.size) errors.push(`${s.label}は${s.size}枚必要です（現在${n}枚）`)
  }

  const copies = copiesByCardNo(deck, lookup)
  for (const [cardNo, n] of copies) {
    if (n <= MAX_COPIES) continue
    const card = [...lookup.values()].find((c) => c.cardNo === cardNo)!
    if (isDailyScene(card)) continue
    errors.push(`${cardNo}「${card.name}」が${n}枚入っています（最大${MAX_COPIES}枚）`)
  }

  const stories = groups.story
  const titles = new Set(stories.map((e) => e.card.storyTitle))
  if (titles.size > 1) errors.push('ストーリーのメインタイトルが揃っていません')
  for (const stage of [1, 2, 3, 4]) {
    const n = stories.filter((e) => e.card.storyStage === stage).reduce((a, e) => a + e.count, 0)
    if (stories.length > 0 && n !== 1) errors.push(`ストーリーの段階${stage}が${n}枚です（各1枚必要）`)
  }

  return errors
}

// ---- 共有コード ----
// 形式: "1:" + "recordId.枚数" を "-" で連結。例: 1:15.1-35.4

const CODE_VERSION = '1'

export function encodeDeck(deck: DeckCards): string {
  const body = Object.entries(deck)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([rid, n]) => `${rid}.${n}`)
    .join('-')
  return `${CODE_VERSION}:${body}`
}

export function decodeDeck(code: string, lookup: Map<string, Card>): DeckCards | null {
  const [version, body] = code.split(':')
  if (version !== CODE_VERSION || body === undefined) return null
  const deck: DeckCards = {}
  for (const part of body.split('-').filter(Boolean)) {
    const [rid, n] = part.split('.')
    const count = Number(n)
    const card = lookup.get(rid)
    if (!card || !isDeckCard(card) || !Number.isInteger(count) || count <= 0) return null
    deck[rid] = count
  }
  return deck
}

export function deckToText(name: string, deck: DeckCards, lookup: Map<string, Card>): string {
  const groups = groupBySection(deck, lookup)
  const lines = [`【${name}】`]
  for (const s of SECTIONS) {
    const entries = groups[s.key]
    lines.push('', `■ ${s.label}（${sectionTotal(entries)}/${s.size}）`)
    for (const e of entries) lines.push(`${e.count} × ${e.card.id} ${e.card.name}`)
  }
  return lines.join('\n')
}

// ---- 分析 ----

export const MAIN_TYPES = ['キャラ', 'イベント', 'アイテム'] as const
export type MainType = (typeof MAIN_TYPES)[number]

export interface HarmonyBucket {
  /** ハーモニーの値。null はハーモニー表記なし */
  harmony: number | null
  byType: Record<MainType, number>
  total: number
}

/** メインデッキのハーモニー別・種別ごとの枚数。1〜7 は常に含め、それ以上は該当がある場合のみ */
export function harmonyDistribution(deck: DeckCards, lookup: Map<string, Card>): HarmonyBucket[] {
  const buckets = new Map<number | null, HarmonyBucket>()
  const bucket = (h: number | null) => {
    let b = buckets.get(h)
    if (!b) buckets.set(h, (b = { harmony: h, byType: { キャラ: 0, イベント: 0, アイテム: 0 }, total: 0 }))
    return b
  }
  for (let h = 1; h <= 7; h++) bucket(h)
  for (const { card, count } of groupBySection(deck, lookup).main) {
    const b = bucket(card.harmony)
    b.byType[card.type as MainType] += count
    b.total += count
  }
  return [...buckets.values()].sort((a, b) => (a.harmony ?? Infinity) - (b.harmony ?? Infinity))
}
