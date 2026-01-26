import { BaseController } from "@buildingai/base";
import { Tag } from "@buildingai/db/entities";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { QueryTagDto } from "@modules/tag/dto";
import { TagService } from "@modules/tag/services/tag.service";
import { Get, Query } from "@nestjs/common";

/**
 * Tag web controller
 *
 * Provides public tag query endpoints
 */
@WebController("tag")
export class TagWebController extends BaseController {
    /**
     * Constructor
     *
     * @param tagService Tag service
     */
    constructor(private readonly tagService: TagService) {
        super();
    }

    /**
     * Query tag list
     *
     * @param queryTagDto DTO for querying tags
     * @returns Tag list
     */
    @Get()
    @Public()
    async findAll(@Query() queryTagDto: QueryTagDto): Promise<Tag[]> {
        return this.tagService.list(queryTagDto);
    }
}
