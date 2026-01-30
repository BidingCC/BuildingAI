import type { MutationOptionsUtil, UserInfo } from "@buildingai/web-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export type AllowedUserField =
    | "nickname"
    | "email"
    | "phone"
    | "avatar"
    | "bio"
    | "gender"
    | "realName";

export type UpdateUserFieldRequest = {
    field: AllowedUserField;
    value: string;
};

export type UpdateUserFieldResponse = {
    user: UserInfo;
    message: string;
};

/**
 * Update user field mutation hook.
 */
export function useUpdateUserFieldMutation(
    options?: MutationOptionsUtil<UpdateUserFieldResponse, UpdateUserFieldRequest>,
) {
    const queryClient = useQueryClient();

    return useMutation<UpdateUserFieldResponse, Error, UpdateUserFieldRequest>({
        mutationFn: (data) =>
            apiHttpClient.patch<UpdateUserFieldResponse>("/user/update-field", data),
        ...options,
        onSuccess: (...args) => {
            queryClient.invalidateQueries({ queryKey: ["user", "info"] });
            options?.onSuccess?.(...args);
        },
    });
}
