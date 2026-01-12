import { Slot } from "@radix-ui/react-slot";

interface ReloadWindowProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  asChild?: boolean;
}

export const ReloadWindow = ({ children, asChild, ...props }: ReloadWindowProps) => {
  const handleReload = () => {
    window.location.reload();
  };

  const Comp = asChild ? Slot : "span";

  return (
    <Comp style={{ cursor: "pointer" }} {...props} onClick={handleReload}>
      {children}
    </Comp>
  );
};
