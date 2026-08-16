import {
    useAddAgentSkillByGit,
    useAddAgentSkillByUpload,
    useAgentSkillsQuery,
    useDeleteAgentSkill,
    type AgentSkill,
} from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { cn } from "@buildingai/ui/lib/utils";
import { GitBranch, Sparkles, Trash2, Upload } from "lucide-react";
import { memo, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * 智能体 Skill 配置组件
 *
 * 支持两种添加方式：
 * 1. 上传 zip 文件（内含 skill.json / SKILL.md）
 * 2. 远程 git 仓库 URL（clone 后解析）
 *
 * 选中的 skill 会绑定到当前智能体实例（agent.skillIds）。
 */
export const Skills = memo(
    ({
        agentId,
        value,
        onChange,
    }: {
        agentId?: string;
        value: string[];
        onChange: (value: string[]) => void;
    }) => {
        const { data: skills = [], isLoading } = useAgentSkillsQuery(agentId ?? "");
        const uploadMutation = useAddAgentSkillByUpload();
        const gitMutation = useAddAgentSkillByGit();
        const deleteMutation = useDeleteAgentSkill();

        const [gitUrl, setGitUrl] = useState("");
        const fileInputRef = useRef<HTMLInputElement>(null);

        const selectedIds = value ?? [];

        const toggleSelect = (id: string) => {
            if (selectedIds.includes(id)) {
                onChange(selectedIds.filter((x) => x !== id));
            } else {
                onChange([...selectedIds, id]);
            }
        };

        const handleUpload = async (file: File) => {
            if (!agentId) return;
            try {
                const created = await uploadMutation.mutateAsync({ agentId, file });
                toast.success(`Skill「${created.name}」添加成功`);
                // 上传后默认选中
                if (!selectedIds.includes(created.id)) {
                    onChange([...selectedIds, created.id]);
                }
            } catch {
                // 错误已由全局 handler 提示
            }
        };

        const handleGitAdd = async () => {
            if (!agentId || !gitUrl.trim()) return;
            try {
                const created = await gitMutation.mutateAsync({
                    agentId,
                    gitUrl: gitUrl.trim(),
                });
                toast.success(`Skill「${created.name}」添加成功`);
                setGitUrl("");
                if (!selectedIds.includes(created.id)) {
                    onChange([...selectedIds, created.id]);
                }
            } catch {
                // 错误已由全局 handler 提示
            }
        };

        const handleDelete = (skill: AgentSkill) => {
            deleteMutation.mutate(
                { agentId: skill.agentId, id: skill.id },
                {
                    onSuccess: () => {
                        onChange(selectedIds.filter((x) => x !== skill.id));
                    },
                },
            );
        };

        if (isLoading) {
            return <Skeleton className="h-40 w-full" />;
        }

        return (
            <div className="space-y-4">
                <Tabs defaultValue="upload">
                    <TabsList>
                        <TabsTrigger value="upload" className="flex items-center gap-1">
                            <Upload className="h-4 w-4" />
                            上传 Zip
                        </TabsTrigger>
                        <TabsTrigger value="git" className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4" />
                            Git 仓库
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            上传包含 skill 定义文件的 zip（优先解析
                            <code className="mx-1 rounded bg-muted px-1">skill.json</code>
                            ，否则
                            <code className="mx-1 rounded bg-muted px-1">SKILL.md</code>
                            ）。
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(file);
                                e.target.value = "";
                            }}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadMutation.isPending}
                        >
                            {uploadMutation.isPending && (
                                <span className="animate-spin">⏳</span>
                            )}
                            选择 Zip 文件上传
                        </Button>
                    </TabsContent>

                    <TabsContent value="git" className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            填写公开 git 仓库 URL（http/https），将自动 clone 并解析 skill
                            定义文件。
                        </p>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://github.com/user/skill-repo.git"
                                value={gitUrl}
                                onChange={(e) => setGitUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleGitAdd();
                                }}
                            />
                            <Button
                                onClick={handleGitAdd}
                                disabled={gitMutation.isPending || !gitUrl.trim()}
                            >
                                {gitMutation.isPending && <span className="animate-spin">⏳</span>}
                                添加
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">已添加 Skill</span>
                        <Badge variant="secondary">{skills.length}</Badge>
                    </div>
                    {skills.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            暂无 Skill，请通过上方方式添加。
                        </p>
                    ) : (
                        <ScrollArea className="max-h-60 pr-2">
                            <ul className="space-y-2">
                                {skills.map((skill) => {
                                    const checked = selectedIds.includes(skill.id);
                                    return (
                                        <li
                                            key={skill.id}
                                            className={cn(
                                                "flex items-start justify-between rounded-md border p-3 transition-colors",
                                                checked
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border",
                                            )}
                                        >
                                            <button
                                                type="button"
                                                className="flex flex-1 items-start gap-2 text-left"
                                                onClick={() => toggleSelect(skill.id)}
                                            >
                                                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                                <span className="space-y-0.5">
                                                    <span className="flex items-center gap-2">
                                                        <span className="font-medium">
                                                            {skill.name}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            {skill.sourceType === "git"
                                                                ? "Git"
                                                                : "上传"}
                                                        </Badge>
                                                    </span>
                                                    {skill.description && (
                                                        <span className="block text-xs text-muted-foreground">
                                                            {skill.description}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => handleDelete(skill)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </ScrollArea>
                    )}
                </div>
            </div>
        );
    },
);

Skills.displayName = "Skills";
