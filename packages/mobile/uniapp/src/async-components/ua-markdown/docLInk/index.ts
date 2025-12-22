import type { PluginWithOptions } from 'markdown-it'

export const docQuotePlugin: PluginWithOptions = (md): void => {
    md.inline.ruler.push('doc_quote', function (state, silent) {
        const pos = state.pos
        // 检查是否还有足够的字符来匹配我们的规则
        if (state.src.charCodeAt(pos) !== 0x5b /* [ */) {
            return false
        }
        // 如果是静默模式，不应该实际进行任何转换，只返回是否匹配即可
        if (silent) {
            return false
        }
        const end = state.src.indexOf(']', pos)
        if (end < 0) {
            return false
        }
        const content = state.src.substring(pos + 1, end)
        if (isNaN(Number(content))) {
            return false
        }
        const { linkList } = state.env
        const docItem = linkList?.[Number(content) - 1]
        if (!docItem) return false
        state.pos = end + 1
        state.posMax = end + 1
        const token_o = state.push('link_open', 'a', 1)

        token_o.attrs = [
            ['href', docItem.seeMoreUrl],
            ['target', '_blank'],
            ['title', docItem.title],
            ['class', 'markdown-doc-link-quote']
        ]
        const token_t = state.push('text', '', 0)
        token_t.content = content
        state.push('link_close', 'a', -1)
        return true
    })
}
