import { useAuthStore } from "@buildingai/stores";
import { CodeBlock, CodeBlockCopyButton } from "@buildingai/ui/components/ai-elements/code-block";
import { ModeToggle } from "@buildingai/ui/components/mode-toggle";
import { ThemeToggle } from "@buildingai/ui/components/theme-toggle";
import { Button } from "@buildingai/ui/components/ui/button";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const code = `function MyComponent(props) {
  return (
    <div>
      <h1>Hello, {props.name}!</h1>
      <p>This is an example React component.</p>
    </div>
  );
}`;

const IndexPage = () => {
  const { logout } = useAuthStore((state) => state.authActions);
  const navigate = useNavigate();
  return (
    <div className="flex">
      <ModeToggle />
      <ThemeToggle />
      <Button asChild>
        <Link to={"/console"}>Go to Console</Link>
      </Button>
      <Button asChild>
        <Link to={"/workflow"}>Go to Workflow Example</Link>
      </Button>
      <Button
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Logout
      </Button>
      <CodeBlock code={code} language="jsx">
        <CodeBlockCopyButton
          onCopy={() => console.log("Copied code to clipboard")}
          onError={() => console.error("Failed to copy code to clipboard")}
        />
      </CodeBlock>
    </div>
  );
};

export default IndexPage;
