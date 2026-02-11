import { EditorKit } from "@buildingai/ui/components/editor/editor-kit";
import { Plate, usePlateEditor } from "@buildingai/ui/components/editor/platejs/react";
import { Editor, EditorContainer } from "@buildingai/ui/components/editor/ui/editor";

import { PageContainer } from "@/layouts/console/_components/page-container";
const AccessRoleIndexPage = () => {
  const editor = usePlateEditor({
    plugins: EditorKit,
  });

  return (
    <PageContainer className="h-inset">
      <Plate editor={editor}>
        <EditorContainer className="rounded-lg border">
          <Editor variant="default" />
        </EditorContainer>
      </Plate>
    </PageContainer>
  );
};

export default AccessRoleIndexPage;
