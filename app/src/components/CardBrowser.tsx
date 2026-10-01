import { useMemo, useState } from 'react'
import { CARD_TYPES, type Card, RARITIES, SUB_SERIES, cards } from '../lib/cards'
import { CardZoom } from './CardZoom'

interface Props {
  countOf: (c: Card) => number
  onAdd: (c: Card) => void
  onShow: (c: Card) => void
}

const COSTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function CardBrowser({ countOf, onAdd, onShow }: Props) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [sub, setSub] = useState('')
  const [rarity, setRarity] = useState('')
  const [harmony, setHarmony] = useState('')
  const [idea, setIdea] = useState('')
  const [showParallel, setShowParallel] = useState(true)
  const [zoomed, setZoomed] = useState<Card | null>(null)

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return cards.filter((c) => {
      if (type && c.type !== type) return false
      if (sub && c.subSeries !== sub) return false
      if (rarity && c.rarity.replace('※', '') !== rarity) return false
      if (harmony && c.harmony !== Number(harmony)) return false
      if (idea && c.idea !== Number(idea)) return false
      if (!showParallel && c.rarity.includes('※')) return false
      if (words.length) {
        const hay = [c.name, c.id, c.effect, ...c.keywords].join(' ').toLowerCase()
        if (!words.every((w) => hay.includes(w))) return false
      }
      return true
    })
  }, [query, type, sub, rarity, harmony, idea, showParallel])

  const reset = () => {
    setQuery(''); setType(''); setSub(''); setRarity(''); setHarmony(''); setIdea(''); setShowParallel(true)
  }

  return (
    <section className="browser">
      <div className="filters">
        <input
          type="search"
          placeholder="名前・番号・キーワード・効果文で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-row">
          <Select label="種別" value={type} onChange={setType} options={CARD_TYPES} />
          <Select label="収録" value={sub} onChange={setSub} options={SUB_SERIES} />
          <Select label="レア" value={rarity} onChange={setRarity} options={RARITIES} />
          <Select label="ハーモニー" value={harmony} onChange={setHarmony} options={COSTS.map(String)} />
          <Select label="アイデア" value={idea} onChange={setIdea} options={COSTS.map(String)} />
          <label className="check">
            <input type="checkbox" checked={showParallel} onChange={(e) => setShowParallel(e.target.checked)} />
            ※版も表示
          </label>
          <button type="button" className="link" onClick={reset}>条件クリア</button>
        </div>
        <div className="hit">{filtered.length} 件</div>
      </div>
      <ul className="grid">
        {filtered.map((c) => {
          const n = countOf(c)
          return (
            <li key={c.recordId} className="tile">
              <div className="tile-frame">
                <button type="button" className="tile-img" onClick={() => onAdd(c)} title="クリックでデッキに追加">
                  <img src={c.image} alt={c.name} loading="lazy" />
                  {n > 0 && <span className="badge">{n}</span>}
                </button>
                <button
                  type="button"
                  className="zoom-btn"
                  onClick={() => setZoomed(c)}
                  title="拡大表示"
                  aria-label={`${c.name}を拡大表示`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="M15.5 15.5 20 20M10.5 7.5v6M7.5 10.5h6" />
                  </svg>
                </button>
              </div>
              <button type="button" className="tile-info" onClick={() => onShow(c)}>
                <span className="tile-no">{c.id}</span>
                <span className="tile-name">{c.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {zoomed && <CardZoom card={zoomed} onClose={() => setZoomed(null)} />}
    </section>
  )
}

function Select(p: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select value={p.value} onChange={(e) => p.onChange(e.target.value)} aria-label={p.label}>
      <option value="">{p.label}</option>
      {p.options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}
