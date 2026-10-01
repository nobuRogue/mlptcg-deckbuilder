import { useEffect } from 'react'
import type { Card } from '../lib/cards'

interface Props {
  card: Card
  count: number
  canAdd: boolean
  onAdd: () => void
  onRemove: () => void
  onClose: () => void
}

export function CardModal({ card, count, canAdd, onAdd, onRemove, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={card.name} onClick={(e) => e.stopPropagation()}>
        <img src={card.image} alt={card.name} />
        <div className="modal-body">
          <h2>{card.name}</h2>
          <dl>
            <dt>番号</dt><dd>{card.id}</dd>
            <dt>種別</dt><dd>{card.type}</dd>
            <dt>収録</dt><dd>{card.series} / {card.subSeries}</dd>
            <dt>レアリティ</dt><dd>{card.rarity}</dd>
            {card.harmony != null && (<><dt>ハーモニー</dt><dd>{card.harmony}</dd></>)}
            {card.idea != null && (<><dt>アイデア</dt><dd>{card.idea}</dd></>)}
            {card.keywords.length > 0 && (<><dt>キーワード</dt><dd>{card.keywords.join(' / ')}</dd></>)}
          </dl>
          {card.effect && <p className="effect">{card.effect}</p>}
          <div className="counter">
            <button type="button" onClick={onRemove} disabled={count === 0}>−</button>
            <span>{count} 枚</span>
            <button type="button" onClick={onAdd} disabled={!canAdd}>＋</button>
          </div>
          <button type="button" className="close" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  )
}
