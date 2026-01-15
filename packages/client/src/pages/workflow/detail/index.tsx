import { WorkflowExample } from "../_components/demo";
import WorkflowLayout from "../_layouts";

const WorkflowDetailPage = () => {
  return (
    <div className="relative h-dvh w-dvw overflow-hidden">
      <WorkflowLayout>
        <WorkflowExample />
        <div className="bg-background absolute bottom-4 left-1/2 z-10 w-3xl -translate-x-1/2 rounded-xl border p-4">
          toolbar
        </div>
      </WorkflowLayout>
    </div>
  );
};

export default WorkflowDetailPage;
