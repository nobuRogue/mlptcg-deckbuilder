import { useState } from 'react'
import { cardById } from '../lib/cards'
import { type DeckCards, MAIN_TYPES, harmonyDistribution } from '../lib/deck'

const CHART_HEIGHT = 96

/** メインデッキのハーモニー別枚数（種別で積み上げ） */
export function HarmonyChart({ deck }: { deck: DeckCards }) {
  const dist = harmonyDistribution(deck, cardById)
  const [active, setActive] = useState<number | null>(null)

  const total = dist.reduce((n, b) => n + b.total, 0)
  const withCost = dist.filter((b) => b.harmony != null)
  const costTotal = withCost.reduce((n, b) => n + b.total, 0)
  const average = costTotal ? withCost.reduce((n, b) => n + b.harmony! * b.total, 0) / costTotal : null
  const max = Math.max(4, ...dist.map((b) => b.total))
  const typeTotals = MAIN_TYPES.map((t) => dist.reduce((n, b) => n + b.byType[t], 0))

  const label = (h: number | null) => (h == null ? '−' : String(h))
  const focused = active == null ? null : dist[active]

  return (
    <section className="section harmony">
      <h3>
        ハーモニー分布
        <span className="count-plain">平均 {average == null ? '−' : average.toFixed(2)}</span>
      </h3>

      <div className="hc-plot" onMouseLeave={() => setActive(null)}>
        {dist.map((b, i) => (
          <div
            key={label(b.harmony)}
            className={`hc-col${active === i ? ' active' : ''}`}
            tabIndex={0}
            aria-label={`ハーモニー${label(b.harmony)}: ${b.total}枚`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span className="hc-total">{b.total || ''}</span>
            <div className="hc-bar" style={{ height: (b.total / max) * CHART_HEIGHT }}>
              {MAIN_TYPES.map((t, ti) =>
                b.byType[t] ? (
                  <div key={t} className={`hc-seg s${ti + 1}`} style={{ flexGrow: b.byType[t] }} />
                ) : null,
              )}
            </div>
            <span className="hc-x">{label(b.harmony)}</span>
          </div>
        ))}
      </div>

      <p className="hc-detail">
        {focused ? (
          <>
            ハーモニー{label(focused.harmony)}：<b>{focused.total}枚</b>
            （{MAIN_TYPES.map((t) => `${t} ${focused.byType[t]}`).join('・')}）
          </>
        ) : total === 0 ? (
          'メインデッキにカードを入れると表示されます'
        ) : (
          '棒にカーソルを合わせると内訳を表示'
        )}
      </p>

      <ul className="hc-legend">
        {MAIN_TYPES.map((t, ti) => (
          <li key={t}>
            <span className={`hc-swatch s${ti + 1}`} />
            {t} {typeTotals[ti]}
          </li>
        ))}
      </ul>
    </section>
  )
}
