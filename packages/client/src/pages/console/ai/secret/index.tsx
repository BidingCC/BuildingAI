import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@buildingai/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { Input } from "@buildingai/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Switch } from "@buildingai/ui/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { ChevronRight, EllipsisVertical, FileJson2, Key, KeyRound, Plus } from "lucide-react";

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
];

const AiSecretIndexPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background gridgrid-cols-1 sticky top-0 z-1 gap-4 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <Input placeholder="搜索" />
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
              <SelectItem value="blueberry">Blueberry</SelectItem>
              <SelectItem value="grapes">Grapes</SelectItem>
              <SelectItem value="pineapple">Pineapple</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4 hover:border-solid">
          <div className="flex items-center gap-3">
            <Button className="size-12 rounded-lg border-dashed" variant="outline">
              <Plus />
            </Button>
            <div className="flex flex-col">
              <span>新增密钥模板</span>
              <span className="text-muted-foreground py-1 text-xs font-medium">
                添加新的密钥模板
              </span>
            </div>
          </div>

          <div className="mt-auto flex gap-4">
            <Button size="xs" className="flex-1" variant="outline">
              <FileJson2 /> 从配置文件导入
            </Button>
            <Button size="xs" className="flex-1" variant="outline">
              <Plus /> 手动创建
            </Button>
          </div>
        </div>
        {Array.from({ length: 15 }).map((_, index) => (
          <div
            key={index}
            className="group/provider-item relative flex flex-col gap-4 rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              <img
                src="https://buildingai.fishblog.cn/static/ai/providers/moonshot.png"
                alt="model.name"
                className="aspect-square size-12 rounded-lg"
              />
              <div className="flex flex-col">
                <span>OpenAI</span>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground px-0 hover:px-2"
                    >
                      管理密钥(28个)
                      <ChevronRight />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>密钥列表</DialogTitle>
                      <DialogDescription>这里可以编辑你的密钥</DialogDescription>
                    </DialogHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Invoice</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.invoice}>
                            <TableCell className="font-medium">{invoice.invoice}</TableCell>
                            <TableCell>{invoice.paymentStatus}</TableCell>
                            <TableCell>{invoice.paymentMethod}</TableCell>
                            <TableCell className="text-right">{invoice.totalAmount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DialogContent>
                </Dialog>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost">
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>编辑</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">apiKey</Badge>
                <Badge variant="secondary">baseUrl</Badge>
                <Switch className="ml-auto opacity-0 group-hover/provider-item:opacity-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiSecretIndexPage;
