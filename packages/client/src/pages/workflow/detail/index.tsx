import WorkflowLayout from "../_layouts";
import Workspace from "../workspace";

const WorkflowDetailPage = () => {
  return (
    <div className="relative h-dvh w-dvw overflow-hidden">
      <WorkflowLayout>
        <Workspace></Workspace>
      </WorkflowLayout>
    </div>
  );
};

export default WorkflowDetailPage;
