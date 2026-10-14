import { type CSSProperties, Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type CardType, cardById } from '../lib/cards'
import { SECTIONS, groupBySection, sectionTotal, validate } from '../lib/deck'
import type { SavedDeck } from '../lib/storage'
import { canCaptureScreen, captureElement, downloadBlob } from '../lib/capture'
import { HarmonyChart } from './HarmonyChart'

const TYPE_ORDER: CardType[] = ['主役', 'ストーリー', 'キャラ', 'イベント', 'アイテム', 'シーン']
/** 1種別のグループが1行に並べる最大セル数（ストーリーは1枚2セル） */
const MAX_COLS = 12

/** 画像共有用のデッキ一覧。全カードを種別ごとに枚数付きで並べる */
export function DeckView({ deck, onClose }: { deck: SavedDeck; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sections = groupBySection(deck.cards, cardById)
  const entries = SECTIONS.flatMap((s) => sections[s.key])
  const groups = TYPE_ORDER.map((type) => {
    const items = entries.filter((e) => e.card.type === type)
    const cells = items.length * (type === 'ストーリー' ? 2 : 1)
    return { type, items, total: sectionTotal(items), cols: Math.min(cells, MAX_COLS) }
  }).filter((g) => g.items.length > 0)
  const legal = validate(deck.cards, cardById).length === 0
  const hasMain = sections.main.length > 0

  const sheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  // クリップボード書き込みはクリック直後に開始する（共有ダイアログを挟むとユーザー操作扱いが切れるため、
  // 画像は Promise のまま ClipboardItem に渡す）
  const copyAsImage = async () => {
    if (!sheetRef.current || busy) return
    setBusy(true)
    setNotice('')
    const blobPromise = captureElement(sheetRef.current)
    blobPromise.catch(() => {})
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
      setNotice('画像をクリップボードにコピーしました')
    } catch {
      let blob: Blob
      try {
        blob = await blobPromise
      } catch (e) {
        const cancelled = e instanceof DOMException && e.name === 'NotAllowedError'
        setNotice(cancelled ? 'キャプチャがキャンセルされました' : `キャプチャに失敗しました（${(e as Error).message}）`)
        return
      }
      downloadBlob(blob, `${deck.name || 'deck'}.png`)
      setNotice('クリップボードにコピーできなかったため、PNG ファイルとして保存しました')
    } finally {
      setBusy(false)
    }
  }

  // デッキ欄はスマホ表示で非表示になることがあるため、body 直下に描画する
  return createPortal(
    <div className="dv-bg" role="dialog" aria-label="デッキビュー">
      <div className="dv-toolbar">
        <span>
          {notice ||
            (canCaptureScreen()
              ? '「画像としてコピー」→ 共有ダイアログで「このタブ」を許可すると、デッキ部分を画像にします'
              : 'この画面をスクリーンショットすると画像で共有できます（Windows: Win + Shift + S）')}
        </span>
        <span className="dv-actions">
          {canCaptureScreen() && (
            <button type="button" className="primary" onClick={copyAsImage} disabled={busy}>
              {busy ? 'キャプチャ中…' : '画像としてコピー'}
            </button>
          )}
          <button type="button" onClick={onClose} autoFocus>閉じる</button>
        </span>
      </div>

      <div className="dv-sheet" ref={sheetRef}>
        <header className="dv-head">
          <h2>{deck.name || '無題のデッキ'}</h2>
          <p>
            {SECTIONS.map((s) => `${s.label.replace('デッキ', '')} ${sectionTotal(sections[s.key])}`).join(' ／ ')}
            <span className={legal ? 'dv-legal ok' : 'dv-legal'}>{legal ? '構築ルールOK' : '構築ルール未達'}</span>
          </p>
        </header>

        {groups.length === 0 && <p className="dv-empty">デッキにカードがありません</p>}

        <div className="dv-groups">
        {groups.map((g) => (
          <Fragment key={g.type}>
          <section className="dv-group" style={{ '--cols': g.cols } as CSSProperties}>
            <h3>
              {g.type}
              <span>{g.total}枚</span>
            </h3>
            <ul className="dv-grid">
              {g.items.map(({ card, count }) => (
                <li key={card.recordId} className={card.type === 'ストーリー' ? 'wide' : ''}>
                  <img src={card.image} alt={card.name} />
                  <span className="dv-count">×{count}</span>
                </li>
              ))}
            </ul>
          </section>
          {/* ハーモニー分布はストーリーの後ろ（主役・ストーリーの行の空き）に置く */}
          {g.type === 'ストーリー' && hasMain && <HarmonyChart deck={deck.cards} variant="view" />}
          </Fragment>
        ))}
        {!groups.some((g) => g.type === 'ストーリー') && hasMain && <HarmonyChart deck={deck.cards} variant="view" />}
        </div>

        <footer className="dv-foot">
          MLPTCG デッキビルド（非公式） ・ 最終更新 {new Date(deck.updatedAt).toLocaleDateString('ja-JP')}
        </footer>
      </div>
    </div>,
    document.body,
  )
}
