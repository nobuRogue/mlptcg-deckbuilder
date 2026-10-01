// 公式カードリストページの __NEXT_DATA__ からカードデータを抽出し、src/data/cards.json に保存する。
// 使い方: npm run fetch-cards
import { writeFile, mkdir } from 'node:fs/promises'

const SOURCE_URL = 'https://www.mlptcg-jp.com/cardlist'
const OUT_FILE = new URL('../src/data/cards.json', import.meta.url)

const res = await fetch(SOURCE_URL)
if (!res.ok) throw new Error(`取得失敗: ${res.status} ${res.statusText}`)
const html = await res.text()

const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)
if (!m) throw new Error('__NEXT_DATA__ が見つかりません。公式サイトの構造が変わった可能性があります。')
const raw = JSON.parse(m[1])?.props?.pageProps?.site?.cards
if (!Array.isArray(raw)) throw new Error('cards 配列が見つかりません。')

const toNum = (v) => (v === '' || v == null ? null : Number(v))

const cards = raw
  .filter((c) => c.published)
  .map((c) => {
    const card = {
      recordId: c.recordId,
      id: c.id,
      cardNo: c.id.replace(/^※/, ''),
      name: c.name,
      image: c.image,
      series: c.series,
      subSeries: c.subSeries,
      rarity: c.rarity,
      type: c.type,
      harmony: toNum(c.harmony),
      idea: toNum(c.idea),
      keywords: c.keyword ? c.keyword.split('/').map((s) => s.trim()).filter(Boolean) : [],
      effect: c.effect,
    }
    if (c.type === 'ストーリー') {
      card.storyTitle = c.name.split('——')[0].trim()
      const stage = c.keyword.match(/ステージマーク\s*(\d)/)
      card.storyStage = stage ? Number(stage[1]) : null
    }
    return card
  })
  .sort((a, b) => Number(a.recordId) - Number(b.recordId))

const ids = new Set(cards.map((c) => c.recordId))
if (ids.size !== cards.length) throw new Error('recordId が重複しています。')

await mkdir(new URL('.', OUT_FILE), { recursive: true })
await writeFile(
  OUT_FILE,
  JSON.stringify({ fetchedAt: new Date().toISOString(), source: SOURCE_URL, cards }, null, 1) + '\n',
)
console.log(`${cards.length} 件のカードを保存しました: ${OUT_FILE.pathname}`)
