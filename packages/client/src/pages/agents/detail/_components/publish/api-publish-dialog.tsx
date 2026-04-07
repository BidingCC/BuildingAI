import { useI18n } from "@buildingai/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@buildingai/ui/components/ui/accordion";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";

export interface PublishApiDocItem {
  title: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  note?: string;
  code?: string;
  copySuccessMessage?: string;
  unavailable?: boolean;
}

interface ApiPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiBaseUrl: string;
  apiKey: string;
  docs: PublishApiDocItem[];
  onCopy: (value: string, successMessage: string) => void | Promise<void>;
}

export function ApiPublishDialog({
  open,
  onOpenChange,
  apiBaseUrl,
  apiKey,
  docs,
  onCopy,
}: ApiPublishDialogProps) {
  const { t } = useI18n();
  const [value, copy] = useCopyToClipboard();
  const methodClassMap: Record<string, string> = {
    GET: "bg-green-50 text-green-700",
    POST: "bg-sky-50 text-sky-700",
    PATCH: "bg-yellow-50 text-yellow-700",
    DELETE: "bg-red-50 text-red-700",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full gap-0 p-0 md:max-w-4xl">
        <DialogHeader className="px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{t("agent.detail.api.title")}</span>
          </DialogTitle>
          <p className="text-muted-foreground text-sm">{t("agent.detail.api.desc")}</p>
        </DialogHeader>

        <div className="max-h-[78vh] space-y-6 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t("agent.detail.api.apiBaseUrl")}</div>
              <div className="flex items-center gap-2">
                <InputGroup>
                  <InputGroupInput placeholder={apiBaseUrl} readOnly />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Copy"
                      title="Copy"
                      size="icon-xs"
                      onClick={() => {
                        copy(apiBaseUrl);
                      }}
                    >
                      {value == apiBaseUrl ? <Check /> : <Copy />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{t("agent.detail.api.apiKey")}</div>
              <div className="flex items-center gap-2">
                <InputGroup>
                  <InputGroupInput type="password" value={apiKey} readOnly />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Copy"
                      title="Copy"
                      size="icon-xs"
                      onClick={() => {
                        copy(apiKey);
                      }}
                    >
                      {value == apiKey ? <Check /> : <Copy />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">{t("agent.detail.api.availableEndpoints")}</div>
            <Accordion type="single" collapsible className="space-y-3">
              {docs.map((item, index) => (
                <AccordionItem
                  key={item.title}
                  value={`${item.title}-${index}`}
                  className="data-[state=open]:border-primary/30 rounded-2xl border px-4"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <Badge
                        variant="secondary"
                        className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 ${methodClassMap[item.method] ?? ""}`}
                      >
                        {item.method}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground text-sm font-medium">{item.title}</div>
                        <div className="text-muted-foreground mt-2 font-mono text-xs break-all">
                          {item.path}
                        </div>
                        <div className="text-muted-foreground mt-2 text-xs leading-5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="bg-muted/25 space-y-4 rounded-xl p-4">
                      {item.note ? (
                        <div className="text-muted-foreground text-xs leading-5">{item.note}</div>
                      ) : null}

                      {item.code ? (
                        <div className="bg-background overflow-hidden rounded-xl border">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <div className="text-sm font-medium">
                              {t("agent.detail.api.requestExample")}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                onCopy(
                                  item.code as string,
                                  item.copySuccessMessage || t("agent.detail.api.exampleCopied"),
                                )
                              }
                            >
                              <Copy className="size-4" />
                              {t("agent.detail.api.copyExample")}
                            </Button>
                          </div>
                          <pre className="overflow-x-auto p-4 text-xs leading-6 whitespace-pre-wrap">
                            <code>{item.code}</code>
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
