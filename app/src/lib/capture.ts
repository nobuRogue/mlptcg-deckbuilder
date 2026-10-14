/**
 * 画面キャプチャで要素を画像にする。
 *
 * 公式のカード画像サーバーが CORS を許可していないため、DOM をキャンバスに描く方式（html2canvas 等）では
 * 画像部分が書き出せない。代わりに画面共有 API（getDisplayMedia）でこのタブを1コマだけ撮影し、要素の範囲を切り出す。
 * PC の Chrome / Edge 向け（スマホのブラウザは getDisplayMedia 非対応）。
 */

// Region Capture（Chrome 104+）の型。標準の DOM 型定義に無いため宣言する
interface CropTargetStatic {
  fromElement(el: Element): Promise<unknown>
}
type CroppableTrack = MediaStreamTrack & { cropTo?: (target: unknown) => Promise<void> }

export const canCaptureScreen = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getDisplayMedia &&
  typeof ClipboardItem !== 'undefined'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 要素がビューポートに収まるよう一時的に縮小する。戻す関数を返す */
function fitIntoViewport(el: HTMLElement): () => void {
  const scroller = el.closest<HTMLElement>('.dv-bg')
  if (scroller) scroller.scrollTop = 0
  const rect = el.getBoundingClientRect()
  const available = window.innerHeight - rect.top - 8
  if (rect.height <= available) return () => {}
  const prev = el.style.zoom
  el.style.zoom = String(available / rect.height)
  return () => {
    el.style.zoom = prev
  }
}

/** このタブを撮影し、el の範囲を PNG にする。ユーザー操作（クリック）の中で同期的に呼ぶこと */
export async function captureElement(el: HTMLElement): Promise<Blob> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false,
    // Chrome 拡張オプション: 共有ダイアログで「このタブ」を優先表示する
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
  } as DisplayMediaStreamOptions)
  const restore = fitIntoViewport(el)
  try {
    const [track] = stream.getVideoTracks() as CroppableTrack[]
    const CropTarget = (window as unknown as { CropTarget?: CropTargetStatic }).CropTarget
    let cropped = false
    if (CropTarget && track.cropTo) {
      await track.cropTo(await CropTarget.fromElement(el))
      cropped = true
    }

    const video = document.createElement('video')
    video.muted = true
    video.srcObject = stream
    await video.play()
    // 共有ダイアログが消えて、縮小後の描画が映るまで少し待つ
    await wait(500)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    if (cropped) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
    } else {
      // Region Capture が無い場合: 映像はタブの表示領域全体なので、要素の位置から切り出す
      const r = el.getBoundingClientRect()
      const scale = video.videoWidth / window.innerWidth
      canvas.width = Math.round(r.width * scale)
      canvas.height = Math.round(r.height * scale)
      ctx.drawImage(video, r.left * scale, r.top * scale, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
    }
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像の生成に失敗しました'))), 'image/png'),
    )
  } finally {
    stream.getTracks().forEach((t) => t.stop())
    restore()
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
