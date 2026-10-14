import { toBlob } from 'html-to-image'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { type CardType, cardById, isDaily } from '../lib/cards'
import { downloadBlob } from '../lib/capture'
import { type DeckEntry, MAIN_TYPES, SECTIONS, groupBySection, sectionTotal, validate } from '../lib/deck'
import type { SavedDeck } from '../lib/storage'

const dash = (v: number | null | undefined) => (v == null ? '−' : v)
const byNo = (a: DeckEntry, b: DeckEntry) => a.card.cardNo.localeCompare(b.card.cardNo)

/** 画像共有用のカードリスト（文字のみ）。メインデッキを左列、主役・ストーリー・シーンを右列に並べる */
export function CardListView({ deck, onClose }: { deck: SavedDeck; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sections = groupBySection(deck.cards, cardById)
  const legal = validate(deck.cards, cardById).length === 0
  const mainByType = MAIN_TYPES.map((type) => {
    const items = sections.main.filter((e) => e.card.type === (type as CardType))
    return { type, items, total: sectionTotal(items) }
  }).filter((g) => g.items.length > 0)
  const storyTitle = sections.story[0]?.card.storyTitle
  const scenes = [...sections.scene].sort(byNo)

  const sheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  // 文字だけの表示なので、DOM をそのまま画像化できる（カード画像の CORS 制約を受けない）。
  // クリップボード書き込みはクリック直後に開始し、画像は Promise のまま渡す
  const copyAsImage = async () => {
    if (!sheetRef.current || busy) return
    setBusy(true)
    setNotice('')
    const blobPromise = toBlob(sheetRef.current, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
      // 画面中央寄せの margin: auto が複製にも残り、画像内で右にずれてはみ出すため消す
      style: { margin: '0', boxShadow: 'none' },
    }).then(
      (b) => b ?? Promise.reject(new Error('画像の生成に失敗しました')),
    )
    blobPromise.catch(() => {})
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
      setNotice('画像をクリップボードにコピーしました')
    } catch {
      try {
        downloadBlob(await blobPromise, `${deck.name || 'deck'}_カードリスト.png`)
        setNotice('クリップボードにコピーできなかったため、PNG ファイルとして保存しました')
      } catch (e) {
        setNotice(`画像化に失敗しました（${(e as Error).message}）`)
      }
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="dv-bg" role="dialog" aria-label="カードリスト">
      <div className="dv-toolbar cl-toolbar">
        <span>{notice || '「画像としてコピー」でこのリストを画像にできます'}</span>
        <span className="dv-actions">
          <button type="button" className="primary" onClick={copyAsImage} disabled={busy}>
            {busy ? '作成中…' : '画像としてコピー'}
          </button>
          <button type="button" onClick={onClose} autoFocus>閉じる</button>
        </span>
      </div>

      <div className="cl-sheet" ref={sheetRef}>
        <header className="dv-head">
          <h2>{deck.name || '無題のデッキ'}</h2>
          <p>
            {SECTIONS.map((s) => `${s.label.replace('デッキ', '')} ${sectionTotal(sections[s.key])}`).join(' ／ ')}
            <span className={legal ? 'dv-legal ok' : 'dv-legal'}>{legal ? '構築ルールOK' : '構築ルール未達'}</span>
          </p>
        </header>

        <div className="cl-columns">
          <div className="cl-col">
            <table className="cl-table">
              <caption>
                メインデッキ <span>{sectionTotal(sections.main)}枚</span>
              </caption>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名前</th>
                  <th title="ハーモニーのコスト">コスト</th>
                  <th>アイデア</th>
                  <th>枚数</th>
                </tr>
              </thead>
              {mainByType.length === 0 ? (
                <tbody>
                  <tr><td colSpan={5} className="cl-empty">未選択</td></tr>
                </tbody>
              ) : (
                mainByType.map((g) => (
                  <tbody key={g.type}>
                    <tr className="cl-sub">
                      <th colSpan={4}>{g.type}</th>
                      <td className="num">{g.total}</td>
                    </tr>
                    {g.items.map(({ card, count }) => (
                      <tr key={card.recordId}>
                        <td className="id">{card.id}</td>
                        <td>{card.name}</td>
                        <td className="num">{dash(card.harmony)}</td>
                        <td className="num">{card.type === 'キャラ' ? dash(card.idea) : ''}</td>
                        <td className="num cl-count">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                ))
              )}
            </table>
          </div>

          <div className="cl-col">
            <table className="cl-table">
              <caption>
                主役 <span>{sectionTotal(sections.lead)}枚</span>
              </caption>
              <tbody>
                {sections.lead.length === 0 && <tr><td colSpan={3} className="cl-empty">未選択</td></tr>}
                {sections.lead.map(({ card, count }) => (
                  <tr key={card.recordId}>
                    <td className="id">{card.id}</td>
                    <td>{card.name}</td>
                    <td className="num cl-count">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="cl-table">
              <caption>
                ストーリー <span>{sectionTotal(sections.story)}枚</span>
                {storyTitle && <div className="cl-story-title">{storyTitle}</div>}
              </caption>
              <tbody>
                {sections.story.length === 0 && <tr><td colSpan={4} className="cl-empty">未選択</td></tr>}
                {sections.story.map(({ card, count }) => (
                  <tr key={card.recordId}>
                    <td className="id">{card.id}</td>
                    <td className="num">{card.storyStage ? `段階${card.storyStage}` : ''}</td>
                    <td>{card.storyTitle === storyTitle ? card.name.split('——')[1] ?? card.name : card.name}</td>
                    <td className="num cl-count">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="cl-table">
              <caption>
                シーンデッキ <span>{sectionTotal(sections.scene)}枚</span>
              </caption>
              <tbody>
                {scenes.length === 0 && <tr><td colSpan={3} className="cl-empty">未選択</td></tr>}
                {scenes.map(({ card, count }) => (
                  <tr key={card.recordId}>
                    <td className="id">{card.id}</td>
                    <td>
                      {card.name}
                      {isDaily(card) && <span className="cl-tag">日常</span>}
                    </td>
                    <td className="num cl-count">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="dv-foot">
          MLPTCG デッキビルド（非公式） ・ 最終更新 {new Date(deck.updatedAt).toLocaleDateString('ja-JP')}
        </footer>
      </div>
    </div>,
    document.body,
  )
}
