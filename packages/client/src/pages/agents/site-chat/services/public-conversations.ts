import { useQuery } from "@tanstack/react-query";

import { getApiBaseUrl } from "@/utils/api";

import { fetchPublicJson } from "./public-http";

export type PublicConversation = {
  id: string;
  title: string;
};

type PublicConversationListResult = {
  items: Array<{
    id: string;
    title?: string | null;
  }>;
};

export async function getPublicConversations(args: {
  agentId: string;
  accessToken: string;
  anonymousIdentifier?: string;
  defaultTitle?: string;
}): Promise<PublicConversation[]> {
  const url = `${getApiBaseUrl()}/v1/conversations?page=1&pageSize=30&sortBy=updatedAt`;
  const data = await fetchPublicJson<PublicConversationListResult>(
    url,
    args.accessToken,
    args.anonymousIdentifier,
  );

  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.title?.trim() || args.defaultTitle || "Untitled",
  }));
}

export function usePublicConversations(
  agentId: string | undefined,
  accessToken: string | undefined,
  anonymousIdentifier?: string,
  defaultTitle?: string,
) {
  return useQuery<PublicConversation[]>({
    queryKey: [
      "public-agent-conversations",
      agentId ?? "",
      accessToken ?? "",
      anonymousIdentifier ?? "",
    ],
    enabled: Boolean(agentId && accessToken),
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: () =>
      getPublicConversations({
        agentId: agentId!,
        accessToken: accessToken!,
        anonymousIdentifier,
        defaultTitle,
      }),
  });
}
