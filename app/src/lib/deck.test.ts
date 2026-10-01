import { describe, expect, it } from 'vitest'
import { type Card, cards } from './cards'
import { type DeckCards, canAdd, decodeDeck, encodeDeck, validate } from './deck'

const mk = (rid: string, over: Partial<Card>): Card => ({
  recordId: rid,
  id: `T-${rid}`,
  cardNo: `T-${rid}`,
  name: `card${rid}`,
  image: '',
  series: '',
  subSeries: '',
  rarity: 'C',
  type: 'キャラ',
  harmony: 1,
  idea: 1,
  keywords: [],
  effect: '',
  ...over,
})

// 合法デッキを組めるテスト用カードプール
const pool: Card[] = [
  mk('1', { type: '主役' }),
  ...[1, 2, 3, 4].map((s) => mk(`s${s}`, { type: 'ストーリー', storyTitle: 'A', storyStage: s })),
  mk('s5', { type: 'ストーリー', storyTitle: 'B', storyStage: 1 }),
  ...Array.from({ length: 13 }, (_, i) => mk(`m${i}`, {})),
  ...Array.from({ length: 4 }, (_, i) => mk(`c${i}`, { type: 'シーン' })),
  // 同じカードナンバーの別バージョン（※付き）
  mk('x1', { id: 'X-01', cardNo: 'X-01' }),
  mk('x2', { id: '※X-01', cardNo: 'X-01' }),
]
const lookup = new Map(pool.map((c) => [c.recordId, c]))

function legalDeck(): DeckCards {
  const d: DeckCards = { '1': 1, s1: 1, s2: 1, s3: 1, s4: 1 }
  for (let i = 0; i < 12; i++) d[`m${i}`] = 4 // 48
  d.m12 = 2 // 50
  d.c0 = 4; d.c1 = 4; d.c2 = 4; d.c3 = 3 // 15
  return d
}

describe('validate', () => {
  it('合法デッキはエラーなし', () => {
    expect(validate(legalDeck(), lookup)).toEqual([])
  })

  it('区分の枚数不足を検出', () => {
    const d = legalDeck()
    delete d['1']
    d.m12 = 1
    const errs = validate(d, lookup)
    expect(errs).toContain('主役は1枚必要です（現在0枚）')
    expect(errs).toContain('メインデッキは50枚必要です（現在49枚）')
  })

  it('※有無を同一カードナンバーとして合算する', () => {
    const d = legalDeck()
    d.m12 = 0
    d.x1 = 3
    d.x2 = 2 // X-01 合計5枚、メイン53枚
    expect(validate(d, lookup).some((e) => e.startsWith('X-01'))).toBe(true)
    expect(canAdd(lookup.get('x2')!, { x1: 3 }, lookup)).toBe(true)
    expect(canAdd(lookup.get('x2')!, { x1: 3, x2: 1 }, lookup)).toBe(false)
  })

  it('ストーリーのタイトル違い・段階重複を検出', () => {
    const d = legalDeck()
    delete d.s1
    d.s5 = 1
    const errs = validate(d, lookup)
    expect(errs).toContain('ストーリーのメインタイトルが揃っていません')
    d.s5 = 0
    d.s2 = 2
    expect(validate(d, lookup)).toContain('ストーリーの段階2が2枚です（各1枚必要）')
  })
})

describe('共有コード', () => {
  it('往復で同じデッキに戻る', () => {
    const d = legalDeck()
    expect(decodeDeck(encodeDeck(d), lookup)).toEqual(d)
  })

  it('不正なコードは null', () => {
    expect(decodeDeck('9:1.1', lookup)).toBeNull()
    expect(decodeDeck('1:nope.1', lookup)).toBeNull()
  })
})

describe('実データ', () => {
  it('全ストーリーにタイトルと段階がある', () => {
    for (const c of cards.filter((c) => c.type === 'ストーリー')) {
      expect(c.storyTitle).toBeTruthy()
      expect([1, 2, 3, 4]).toContain(c.storyStage)
    }
  })
})
