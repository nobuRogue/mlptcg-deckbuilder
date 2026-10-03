import { useState } from 'react'
import { type Card, cardById } from '../lib/cards'
import { SECTIONS, deckToText, encodeDeck, groupBySection, sectionTotal, validate } from '../lib/deck'
import type { SavedDeck } from '../lib/storage'
import { DeckView } from './DeckView'
import { HarmonyChart } from './HarmonyChart'

interface Props {
  deck: SavedDeck
  decks: SavedDeck[]
  onSelect: (id: string) => void
  onNew: () => void
  onDuplicate: () => void
  onDelete: () => void
  onRename: (name: string) => void
  onClear: () => void
  onAdd: (c: Card) => void
  onRemove: (c: Card) => void
  onShow: (c: Card) => void
}

export function DeckPanel(p: Props) {
  const groups = groupBySection(p.deck.cards, cardById)
  const errors = validate(p.deck.cards, cardById)
  const [notice, setNotice] = useState('')
  const [viewing, setViewing] = useState(false)

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(`${label}をコピーしました`)
    } catch {
      window.prompt(`${label}（手動でコピーしてください）`, text)
    }
    setTimeout(() => setNotice(''), 2500)
  }

  const shareUrl = () => {
    const url = new URL(location.href)
    url.hash = `d=${encodeDeck(p.deck.cards)}&n=${encodeURIComponent(p.deck.name)}`
    return url.toString()
  }

  return (
    <aside className="deck">
      <div className="deck-head">
        <select value={p.deck.id} onChange={(e) => p.onSelect(e.target.value)} aria-label="デッキ選択">
          {p.decks.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <input value={p.deck.name} onChange={(e) => p.onRename(e.target.value)} aria-label="デッキ名" />
        <div className="deck-actions">
          <button type="button" onClick={p.onNew}>新規</button>
          <button type="button" onClick={p.onDuplicate}>複製</button>
          <button type="button" onClick={p.onClear}>空にする</button>
          <button type="button" className="danger" onClick={p.onDelete}>削除</button>
        </div>
        <div className="deck-actions">
          <button type="button" className="primary" onClick={() => copy(shareUrl(), '共有URL')}>共有URLをコピー</button>
          <button type="button" onClick={() => copy(deckToText(p.deck.name, p.deck.cards, cardById), 'テキスト')}>
            テキストをコピー
          </button>
          <button type="button" onClick={() => setViewing(true)}>デッキビュー</button>
        </div>
        {notice && <div className="notice">{notice}</div>}
      </div>
      {viewing && <DeckView deck={p.deck} onClose={() => setViewing(false)} />}

      {errors.length === 0 ? (
        <div className="ok">構築ルールを満たしています</div>
      ) : (
        <ul className="errors">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <HarmonyChart deck={p.deck.cards} />

      {SECTIONS.map((s) => {
        const entries = groups[s.key]
        const n = sectionTotal(entries)
        return (
          <section key={s.key} className="section">
            <h3>
              {s.label}
              <span className={n === s.size ? 'count ok-text' : 'count'}>{n} / {s.size}</span>
            </h3>
            {entries.length === 0 ? (
              <p className="empty">未選択</p>
            ) : (
              <ul className="entries">
                {entries.map(({ card, count }) => (
                  <li key={card.recordId}>
                    <button type="button" className="entry-name" onClick={() => p.onShow(card)}>
                      <img src={card.image} alt="" loading="lazy" />
                      <span>
                        <small>{card.id}{card.harmony != null && ` ・H${card.harmony}`}</small>
                        {card.name}
                      </span>
                    </button>
                    <span className="entry-count">
                      <button type="button" onClick={() => p.onRemove(card)} aria-label="1枚減らす">−</button>
                      <b>{count}</b>
                      <button type="button" onClick={() => p.onAdd(card)} aria-label="1枚増やす">＋</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </aside>
  )
}
