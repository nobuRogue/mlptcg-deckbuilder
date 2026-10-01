import { useEffect, useState } from 'react'
import './App.css'
import { CardBrowser } from './components/CardBrowser'
import { CardModal } from './components/CardModal'
import { DeckPanel } from './components/DeckPanel'
import { type Card, cardById, fetchedAt } from './lib/cards'
import { type DeckCards, canAdd, decodeDeck, groupBySection, sectionTotal } from './lib/deck'
import { type Store, loadStore, newDeck, saveStore } from './lib/storage'

/** URL の #d=...&n=... で渡された共有デッキ（起動時に1回だけ読み取る） */
const sharedDeck = (() => {
  const params = new URLSearchParams(location.hash.slice(1))
  const code = params.get('d')
  if (!code) return null
  history.replaceState(null, '', location.pathname + location.search)
  const cards = decodeDeck(code, cardById)
  if (!cards) {
    alert('共有URLのデッキを読み込めませんでした。')
    return null
  }
  return newDeck(`${params.get('n') || '共有デッキ'}（共有）`, cards)
})()

function initialStore(): Store {
  const s = loadStore()
  if (!sharedDeck || s.decks.some((d) => d.id === sharedDeck.id)) return s
  return { decks: [...s.decks, sharedDeck], currentId: sharedDeck.id }
}

export default function App() {
  const [store, setStore] = useState<Store>(initialStore)
  const [shown, setShown] = useState<Card | null>(null)
  const [tab, setTab] = useState<'cards' | 'deck'>('cards')

  useEffect(() => saveStore(store), [store])

  // 開いたままのタブに共有URLを貼り付けた場合も取り込めるよう、再読み込みする
  useEffect(() => {
    const onHash = () => location.hash.includes('d=') && location.reload()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const deck = store.decks.find((d) => d.id === store.currentId) ?? store.decks[0]

  const updateCards = (f: (cards: DeckCards) => DeckCards) =>
    setStore((s) => ({
      ...s,
      decks: s.decks.map((d) =>
        d.id === deck.id ? { ...d, cards: f(d.cards), updatedAt: new Date().toISOString() } : d,
      ),
    }))

  const add = (c: Card) => {
    if (!canAdd(c, deck.cards, cardById)) return
    updateCards((cards) => ({ ...cards, [c.recordId]: (cards[c.recordId] ?? 0) + 1 }))
  }
  const remove = (c: Card) =>
    updateCards((cards) => {
      const { [c.recordId]: n = 0, ...rest } = cards
      return n > 1 ? { ...rest, [c.recordId]: n - 1 } : rest
    })

  const total = Object.values(groupBySection(deck.cards, cardById)).reduce((n, g) => n + sectionTotal(g), 0)

  const addDeck = (cards: DeckCards = {}, name?: string) => {
    const d = newDeck(name, cards)
    setStore((s) => ({ decks: [...s.decks, d], currentId: d.id }))
  }

  return (
    <div className="app">
      <header>
        <h1>MLPTCG デッキビルド</h1>
        <span className="meta">
          カードデータ: {new Date(fetchedAt).toLocaleDateString('ja-JP')} 時点 ／ 非公式ファンツールです。カード画像・テキストの権利は各権利者に帰属します。
        </span>
      </header>
      <nav className="tabs">
        <button type="button" className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}>カード一覧</button>
        <button type="button" className={tab === 'deck' ? 'active' : ''} onClick={() => setTab('deck')}>デッキ（{total}）</button>
      </nav>
      <main className={`layout show-${tab}`}>
        <CardBrowser
          countOf={(c) => deck.cards[c.recordId] ?? 0}
          onAdd={add}
          onShow={setShown}
        />
        <DeckPanel
          deck={deck}
          decks={store.decks}
          onSelect={(id) => setStore((s) => ({ ...s, currentId: id }))}
          onNew={() => addDeck()}
          onDuplicate={() => addDeck({ ...deck.cards }, `${deck.name}のコピー`)}
          onDelete={() => {
            if (!confirm(`「${deck.name}」を削除しますか？`)) return
            setStore((s) => {
              const decks = s.decks.filter((d) => d.id !== deck.id)
              if (decks.length === 0) decks.push(newDeck())
              return { decks, currentId: decks[0].id }
            })
          }}
          onRename={(name) => setStore((s) => ({ ...s, decks: s.decks.map((d) => (d.id === deck.id ? { ...d, name } : d)) }))}
          onClear={() => confirm('デッキを空にしますか？') && updateCards(() => ({}))}
          onAdd={add}
          onRemove={remove}
          onShow={setShown}
        />
      </main>
      {shown && (
        <CardModal
          card={shown}
          count={deck.cards[shown.recordId] ?? 0}
          canAdd={canAdd(shown, deck.cards, cardById)}
          onAdd={() => add(shown)}
          onRemove={() => remove(shown)}
          onClose={() => setShown(null)}
        />
      )}
    </div>
  )
}
