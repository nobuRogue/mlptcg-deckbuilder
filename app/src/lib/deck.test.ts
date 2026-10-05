import { describe, expect, it } from 'vitest'
import { type Card, cardById, cards } from './cards'
import { type DeckCards, canAdd, decodeDeck, encodeDeck, harmonyDistribution, validate } from './deck'

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

describe('日常シーン・トークン', () => {
  const daily = mk('d1', { type: 'シーン', keywords: ['広場', '日常'] })
  const token = mk('t1', { type: 'トークン', id: 'TK-01', cardNo: 'TK-01' })
  const lk = new Map([...lookup, ['d1', daily], ['t1', token]])

  it('キーワード「日常」のシーンは4枚を超えて入れられる', () => {
    expect(canAdd(daily, { d1: 10 }, lk)).toBe(true)
    const d = legalDeck()
    delete d.c0; delete d.c1; delete d.c2; delete d.c3
    d.d1 = 15
    expect(validate(d, lk)).toEqual([])
  })

  it('トークンは追加できず、区分にも数えない', () => {
    expect(canAdd(token, {}, lk)).toBe(false)
    expect(validate({ ...legalDeck(), t1: 1 }, lk)).toEqual([])
    expect(decodeDeck('1:t1.1', lk)).toBeNull()
  })
})

describe('harmonyDistribution', () => {
  it('メインデッキだけをハーモニー別・種別ごとに数える', () => {
    const lk = new Map(lookup)
    lk.set('e1', mk('e1', { type: 'イベント', harmony: 3 }))
    lk.set('h9', mk('h9', { harmony: 9 }))
    const dist = harmonyDistribution({ '1': 1, m0: 4, e1: 2, h9: 1, c0: 4 }, lk)
    expect(dist.map((b) => b.harmony)).toEqual([1, 2, 3, 4, 5, 6, 7, 9])
    expect(dist[0]).toMatchObject({ total: 4, byType: { キャラ: 4, イベント: 0, アイテム: 0 } })
    expect(dist[2]).toMatchObject({ total: 2, byType: { キャラ: 0, イベント: 2, アイテム: 0 } })
    expect(dist.reduce((n, b) => n + b.total, 0)).toBe(7)
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
  it('ナイトメアナイト広場（日常シーン）は5枚目も追加できる', () => {
    const plaza = cards.find((c) => c.cardNo === 'BP03-ER01')!
    expect(canAdd(plaza, { [plaza.recordId]: 4 }, cardById)).toBe(true)
  })

  it('ナイトメアナイト市場以外の現行シーンは日常（画像で確認済み）で、5枚目も追加できる', () => {
    const scenes = cards.filter((c) => c.type === 'シーン' && c.cardNo !== 'BP03-ER02')
    expect(scenes.length).toBeGreaterThan(0)
    for (const s of scenes) expect(canAdd(s, { [s.recordId]: 4 }, cardById)).toBe(true)
  })

  it('ナイトメアナイト市場（日常マークなし）は※版・別イラストと合わせて4枚まで', () => {
    const market = cards.filter((c) => c.cardNo === 'BP03-ER02')
    expect(market.length).toBeGreaterThan(1)
    expect(canAdd(market[0], { [market[1].recordId]: 4 }, cardById)).toBe(false)
    expect(canAdd(market[0], { [market[1].recordId]: 3 }, cardById)).toBe(true)
  })

  it('日常でないキャラは4枚まで', () => {
    const chara = cards.find((c) => c.type === 'キャラ')!
    expect(canAdd(chara, { [chara.recordId]: 4 }, cardById)).toBe(false)
  })

  it('トークンはデッキに追加できない', () => {
    const tokens = cards.filter((c) => c.type === 'トークン')
    expect(tokens.length).toBeGreaterThan(0)
    for (const t of tokens) expect(canAdd(t, {}, cardById)).toBe(false)
  })

  it('全ストーリーにタイトルと段階がある', () => {
    for (const c of cards.filter((c) => c.type === 'ストーリー')) {
      expect(c.storyTitle).toBeTruthy()
      expect([1, 2, 3, 4]).toContain(c.storyStage)
    }
  })
})
