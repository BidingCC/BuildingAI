import { Variable } from "lucide-react";

interface VarInputProps {
  name: string;
  label: string;
  type: "string" | "number";
  required: boolean;
}

function VarInput(props: VarInputProps) {
  const handleEditVar = () => {
    console.log(11);
  };

  return (
    <div className="">
      <div className="mb-1">{props.label}</div>
      <div
        className="flex h-8 items-center justify-between rounded border border-gray-300 bg-gray-100 px-2 py-1 select-none"
        onDoubleClick={handleEditVar}
      >
        <div className="flex items-center">
          <Variable size={16} className="text-primary mr-1"></Variable>
          <div className="text-sm">
            <span className="text-yellow-400 uppercase">&#123;{props.type}&#125;</span> -{" "}
            {props.name}
          </div>
        </div>
        <div>{props.required ? "必填" : "选填"}</div>
      </div>
    </div>
  );
}

export { VarInput };
