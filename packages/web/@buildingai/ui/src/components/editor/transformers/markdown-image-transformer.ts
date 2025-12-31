import { TextMatchTransformer } from "@lexical/markdown"

import {
  $createImageNode,
  $isImageNode,
  ImageNode,
} from "@buildingai/ui/components/editor/nodes/image-node"

export const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null
    }

    return `![${node.getAltText()}](${node.getSrc()})`
  },
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
  replace: (textNode, match) => {
    const [, altText, src] = match
    const imageNode = $createImageNode({
      altText,
      maxWidth: 800,
      src,
    })
    textNode.replace(imageNode)
  },
  trigger: ")",
  type: "text-match",
}
