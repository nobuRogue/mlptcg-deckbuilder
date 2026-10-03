/**
 * 効果文の表示。公式データでは能力アイコンが「*出会い*」「＊ひらめき＊」のように記号で囲まれ、
 * 起動コストがある場合は「*冒険エリア#横置き*」のように # 以降に書かれているので、タグとして表示する。
 */
export function EffectText({ text }: { text: string }) {
  const parts = text.split(/([*＊][^*＊\n]+[*＊])/)
  return (
    <p className="effect">
      {parts.map((part, i) => {
        if (i % 2 === 0) return part
        const [label, cost] = part.slice(1, -1).split('#')
        return (
          <span key={i} className="fx">
            <span className="fx-tag">{label}</span>
            {cost && <span className="fx-cost">{cost}</span>}
          </span>
        )
      })}
    </p>
  )
}
