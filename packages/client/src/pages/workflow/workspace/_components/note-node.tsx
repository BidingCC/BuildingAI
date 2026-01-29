import type { NodeProps } from "@xyflow/react";

import { NoteBlockComponent } from "../blocks";
import type { NoteNodeData } from "../blocks/note/note.types";

type NoteNodeProps = NodeProps & { data: NoteNodeData };

function NoteNode(props: NoteNodeProps) {
  const NodeComponent = NoteBlockComponent.Node;
  return (
    <div>
      <NodeComponent id={props.id} data={props.data}></NodeComponent>
    </div>
  );
}

export default NoteNode;
