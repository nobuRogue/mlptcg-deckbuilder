import data from '../data/cards.json'
import overrides from '../data/overrides.json'

export type CardType = 'キャラ' | 'イベント' | 'アイテム' | 'シーン' | 'ストーリー' | '主役'

export interface Card {
  recordId: string
  id: string
  /** 枚数制限の単位となるカードナンバー（先頭の※を除いたもの） */
  cardNo: string
  name: string
  image: string
  series: string
  subSeries: string
  rarity: string
  type: CardType
  harmony: number | null
  idea: number | null
  keywords: string[]
  effect: string
  storyTitle?: string
  storyStage?: number | null
}

export const cards = data.cards as Card[]
export const fetchedAt = data.fetchedAt

export const cardById = new Map(cards.map((c) => [c.recordId, c]))

const dailySceneCardNos = new Set<string>(overrides.dailySceneCardNos)
export const isDailyScene = (c: Card) => c.type === 'シーン' && dailySceneCardNos.has(c.cardNo)

export const CARD_TYPES: CardType[] = ['キャラ', 'イベント', 'アイテム', 'シーン', 'ストーリー', '主役']

const uniq = <T,>(xs: T[]) => [...new Set(xs)]
export const SUB_SERIES = uniq(cards.map((c) => c.subSeries))
export const RARITIES = uniq(cards.map((c) => c.rarity.replace('※', ''))).sort(
  (a, b) => rarityOrder(a) - rarityOrder(b),
)

function rarityOrder(r: string) {
  const order = ['C', 'U', 'SR', 'RR', 'ER', 'CR', 'GR', 'SPR', 'PR']
  const i = order.indexOf(r)
  return i < 0 ? order.length : i
}
