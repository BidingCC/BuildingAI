import type { PluginWithOptions } from 'markdown-it'

const defaultMarker = '#'
interface CustomLinkPluginOptions {
    marker: string
}
export const customLinkPlugin: PluginWithOptions<
    Partial<CustomLinkPluginOptions>
> = (md, options = {}): void => {
    const marker = options.marker || defaultMarker

    md.block.ruler.before(
        'paragraph',
        'custom_link',
        function (state, startLine, endLine, silent) {
            const pos = state.bMarks[startLine] + state.tShift[startLine]
            const max = state.eMarks[startLine]

            if (pos >= max) {
                return false
            }
            if (silent) {
                return true
            }

            const text = state.src.substring(pos, max)

            const start = text.indexOf(marker)
            const end = text.lastIndexOf(marker)
            if (start < 0 || end < 0 || start == end) {
                return false
            }
            const startResult = text.substring(0, start)
            const content = text.substring(start + 1, end)
            const token_p_o = state.push('p_open', 'div', 1)
            token_p_o.map = [startLine, state.line]
            const token_t = state.push('inline', '', 0)
            token_t.content = startResult
            token_t.children = []
            const token_a_o = state.push('link_open', 'a', 1)
            token_a_o.attrs = [['class', 'markdown-custom-link']]
            token_a_o.map = [startLine, state.line]

            const token = state.push('inline', '', 0)
            token.content = content
            token.children = []
            state.push('link_close', 'a', -1)
            state.push('p_close', 'div', -1)
            state.line = startLine + 1
            return true
        },
        {
            alt: ['paragraph']
        }
    )
}
