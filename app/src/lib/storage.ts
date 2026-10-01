import type { DeckCards } from './deck'

export interface SavedDeck {
  id: string
  name: string
  cards: DeckCards
  updatedAt: string
}

export interface Store {
  decks: SavedDeck[]
  currentId: string
}

const KEY = 'mlptcg-deckbuild:v1'

export const newDeck = (name = '新しいデッキ', cards: DeckCards = {}): SavedDeck => ({
  id: crypto.randomUUID(),
  name,
  cards,
  updatedAt: new Date().toISOString(),
})

export function loadStore(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Store | null
    if (s && s.decks.length > 0) return s
  } catch {
    // 壊れたデータ・ストレージ不可の場合は新規作成
  }
  const d = newDeck()
  return { decks: [d], currentId: d.id }
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // プライベートモード等で保存できない場合は無視
  }
}
