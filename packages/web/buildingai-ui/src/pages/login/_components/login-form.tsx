import { postLogin } from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import { Checkbox } from "@buildingai/ui/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@buildingai/ui/components/ui/field";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { cn } from "@buildingai/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import SvgIcons from "../../../components/svg-icons";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const { setToken } = useAuthStore((state) => state.authActions);
  const navigate = useNavigate();

  const loginHandler = async () => {
    const { token } = await postLogin({
      username: "admin1",
      password: "BuildingAI&123456",
      terminal: 1,
    });
    setToken(token);
    navigate("/console");
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your Wechat or Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loginHandler();
            }}
          >
            <FieldGroup>
              <Field>
                <Button variant="secondary" type="button">
                  <SvgIcons.wechat />
                  Login with Wechat
                </Button>
                <Button variant="secondary" type="button">
                  <SvgIcons.google />
                  Login with Google
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field>
                <FieldLabel htmlFor="email">Email / UserName</FieldLabel>
                <Input id="email" type="email" placeholder="m@example.com" required />
              </Field>
              {/* <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required />
              </Field> */}
              {/* <Field>
                <FieldDescription className="">
                  <span className="flex items-center gap-3">
                    <Checkbox id="terms" />
                    <Label htmlFor="terms">Terms of Service and Privacy Policy.</Label>
                  </span>
                </FieldDescription>
              </Field> */}

              <Field>
                <Button type="submit" className="w-full">
                  Next <ArrowRight />
                </Button>

                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="#">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
