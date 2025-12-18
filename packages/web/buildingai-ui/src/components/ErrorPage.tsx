import { isRouteErrorResponse, useRouteError } from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        {error.status}
        {error.data}
      </div>
    );
  }

  return <div>{(error as Error).message}</div>;
};

export default ErrorPage;
