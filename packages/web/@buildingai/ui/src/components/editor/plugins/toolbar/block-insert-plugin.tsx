"use client"

import { PlusIcon } from "lucide-react"

import { useEditorModal } from "@buildingai/ui/components/editor/editor-hooks/use-modal"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
} from "@buildingai/ui/components/ui/select"

export function BlockInsertPlugin({ children }: { children: React.ReactNode }) {
  const [modal] = useEditorModal()

  return (
    <>
      {modal}
      <Select value={""}>
        <SelectTrigger className="!h-8 w-min gap-1">
          <PlusIcon className="size-4" />
          <span>Insert</span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
    </>
  )
}
