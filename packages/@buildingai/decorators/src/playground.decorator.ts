import { BusinessCode } from "@buildingai/constants/shared/business-code.constant";
import { type UserPlayground } from "@buildingai/db";
import { HttpErrorFactory } from "@buildingai/errors";
import { checkForbiddenDecorators } from "@buildingai/utils";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const Playground = createParamDecorator(
    (property: string | undefined, context: ExecutionContext): UserPlayground | object => {
        checkForbiddenDecorators(context, ["decorator:is-public-controller"]);

        const request = context.switchToHttp().getRequest<Request>();
        const user = request.user;

        if (!user) {
            throw HttpErrorFactory.unauthorized(
                "User not authenticated or session expired",
                BusinessCode.UNAUTHORIZED,
            );
        }

        if (property) {
            return request[property];
        }

        return user;
    },
);
