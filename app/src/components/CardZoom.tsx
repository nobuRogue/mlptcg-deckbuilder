import { useEffect } from 'react'
import type { Card } from '../lib/cards'

/** カード画像の拡大表示。背景クリック・Esc・閉じるボタンで閉じる */
export function CardZoom({ card, onClose }: { card: Card; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="zoom-bg" role="dialog" aria-label={`${card.name}の拡大表示`} onClick={onClose}>
      <figure className="zoom" onClick={(e) => e.stopPropagation()}>
        <img src={card.image} alt={card.name} />
        <figcaption>
          <span>{card.id}</span> {card.name}
        </figcaption>
      </figure>
      <button type="button" className="zoom-close" onClick={onClose} aria-label="閉じる" autoFocus>
        ×
      </button>
    </div>
  )
}
