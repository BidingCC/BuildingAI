import type { McpServer, McpServerType } from "@buildingai/services/web";
import { PromptInputButton as AIPromptInputButton } from "@buildingai/ui/components/ai-elements/prompt-input";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@buildingai/ui/components/ui/command";
import { InputGroupButton } from "@buildingai/ui/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@buildingai/ui/components/ui/popover";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { memo, useMemo, useState } from "react";

import SvgIcons from "../../svg-icons";

export interface McpSelectorProps {
  mcpServers: McpServer[];
  selectedMcpServerIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const McpSelector = memo(
  ({ mcpServers, selectedMcpServerIds, onSelectionChange }: McpSelectorProps) => {
    const [open, setOpen] = useState(false);
    const [filterType, setFilterType] = useState<McpServerType | "all">("all");

    const selectedServers = useMemo(
      () => mcpServers.filter((server) => selectedMcpServerIds.includes(server.id)),
      [mcpServers, selectedMcpServerIds],
    );

    const systemServers = useMemo(
      () => mcpServers.filter((server) => server.type === "system"),
      [mcpServers],
    );

    const userServers = useMemo(
      () => mcpServers.filter((server) => server.type === "user"),
      [mcpServers],
    );

    const handleToggle = (serverId: string) => {
      const isSelected = selectedMcpServerIds.includes(serverId);
      if (isSelected) {
        onSelectionChange(selectedMcpServerIds.filter((id) => id !== serverId));
      } else {
        onSelectionChange([...selectedMcpServerIds, serverId]);
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <AIPromptInputButton
            className={selectedServers.length > 0 ? "bg-accent text-accent-foreground" : undefined}
          >
            <SvgIcons.mcp className="size-4" />
            {selectedServers.length > 0 ? (
              <AvatarGroup className="ml-1">
                {selectedServers.slice(0, 3).map((server) => (
                  <Avatar key={server.id} className="size-5 rounded-sm after:rounded-sm">
                    {server.icon ? (
                      <AvatarImage className="rounded-sm" src={server.icon} alt={server.name} />
                    ) : null}
                    <AvatarFallback className="rounded-sm text-xs">
                      {server.name?.slice(0, 1).toUpperCase() || "M"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {selectedServers.length > 3 && (
                  <AvatarGroupCount className="rounded-sm text-xs">
                    +{selectedServers.length - 3}
                  </AvatarGroupCount>
                )}
              </AvatarGroup>
            ) : (
              <span>工具</span>
            )}
            <ChevronDownIcon className="text-muted-foreground size-4" />
          </AIPromptInputButton>
        </PopoverTrigger>
        <PopoverContent className="w-70 p-0" align="center">
          <Command>
            <div className="flex items-center gap-1 p-1 pb-0">
              <div className="flex-1">
                <CommandInput placeholder="搜索 MCP 服务器..." className="h-7" />
              </div>
              <InputGroupButton
                size="xs"
                variant="default"
                className="mt-1 size-7 shrink-0 rounded-full p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: 处理新增 MCP 服务器的逻辑
                }}
              >
                <PlusIcon className="size-4" />
              </InputGroupButton>
            </div>
            <div className="mt-1 border-b px-2 py-1.5">
              <div className="flex gap-1">
                <Button
                  variant={filterType === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => setFilterType("all")}
                >
                  全部
                </Button>
                <Button
                  variant={filterType === "system" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => setFilterType("system")}
                >
                  系统
                </Button>
                <Button
                  variant={filterType === "user" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={() => setFilterType("user")}
                >
                  我的
                </Button>
              </div>
            </div>
            <CommandList>
              <CommandEmpty>未找到 MCP 服务器</CommandEmpty>
              {(filterType === "all" || filterType === "system") && systemServers.length > 0 && (
                <>
                  <CommandGroup heading="系统服务">
                    {systemServers.map((server) => {
                      const isSelected = selectedMcpServerIds.includes(server.id);
                      return (
                        <CommandItem
                          key={server.id}
                          onSelect={() => handleToggle(server.id)}
                          className="flex items-center gap-2"
                          data-checked={isSelected}
                        >
                          <Avatar className="size-7 rounded-sm after:rounded-sm">
                            {server.icon ? (
                              <AvatarImage
                                className="rounded-sm"
                                src={server.icon}
                                alt={server.name}
                              />
                            ) : null}
                            <AvatarFallback className="rounded-sm text-xs">
                              {server.name?.slice(0, 1).toUpperCase() || "M"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-1 flex-col gap-0.5">
                            <span className="text-sm font-medium">{server.name}</span>
                            {server.description && (
                              <span className="text-muted-foreground line-clamp-1 text-xs">
                                {server.description}
                              </span>
                            )}
                          </div>
                          {server.tools && server.tools.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {server.tools.length} 工具
                            </Badge>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {filterType === "all" && userServers.length > 0 && <CommandSeparator />}
                </>
              )}
              {(filterType === "all" || filterType === "user") && userServers.length > 0 && (
                <CommandGroup heading="我的服务">
                  {userServers.map((server) => {
                    const isSelected = selectedMcpServerIds.includes(server.id);
                    return (
                      <CommandItem
                        key={server.id}
                        onSelect={() => handleToggle(server.id)}
                        className="flex items-center gap-2"
                        data-checked={isSelected}
                      >
                        <Avatar className="size-7 rounded-sm after:rounded-sm">
                          {server.icon ? (
                            <AvatarImage
                              className="rounded-sm"
                              src={server.icon}
                              alt={server.name}
                            />
                          ) : null}
                          <AvatarFallback className="rounded-sm text-xs">
                            {server.name?.slice(0, 1).toUpperCase() || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-1 flex-col gap-0.5">
                          <span className="text-sm font-medium">{server.name}</span>
                          {server.description && (
                            <span className="text-muted-foreground line-clamp-1 text-xs">
                              {server.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

McpSelector.displayName = "McpSelector";
