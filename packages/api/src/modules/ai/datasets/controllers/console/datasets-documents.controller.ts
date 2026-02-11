import { type FindOptionsWhere, ILike, Raw } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Get, Param, Query } from "@nestjs/common";

import { ListDocumentsDto } from "../../dto/document.dto";
import { DatasetsService } from "../../services/datasets.service";
import { DatasetsDocumentService } from "../../services/datasets-document.service";

const LIST_ORDER: Record<string, Record<string, "ASC" | "DESC">> = {
    name: { fileName: "ASC" },
    size: { fileSize: "ASC" },
    uploadTime: { createdAt: "DESC" },
};

@ConsoleController("datasets-documents", "知识库文档")
export class DatasetsDocumentsConsoleController {
    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly documentService: DatasetsDocumentService,
    ) {}

    @Get(":datasetId/documents")
    @Permissions({ code: "list", name: "文档列表", description: "分页查询知识库文档" })
    async listDocuments(@Param("datasetId") datasetId: string, @Query() query: ListDocumentsDto) {
        const dataset = await this.datasetsService.findOneById(datasetId);
        if (!dataset) throw HttpErrorFactory.notFound("知识库不存在");
        const keyword = query?.keyword?.trim();
        const sortBy = query?.sortBy ?? "uploadTime";
        const where: FindOptionsWhere<any> = keyword
            ? ([
                  { datasetId, fileName: ILike(`%${keyword}%`) },
                  { datasetId, summary: ILike(`%${keyword}%`) },
                  {
                      datasetId,
                      tags: Raw((alias) => `array_to_string(${alias}, ' ') ILIKE :kw`, {
                          kw: `%${keyword}%`,
                      }),
                  },
              ] as FindOptionsWhere<any>)
            : { datasetId };
        const order = LIST_ORDER[sortBy] ?? LIST_ORDER.uploadTime;
        return this.documentService.paginate(query, { where, order });
    }
}
