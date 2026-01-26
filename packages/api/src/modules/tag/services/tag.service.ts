import { BaseService } from "@buildingai/base";
import { TagType, TagTypeType } from "@buildingai/constants";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Tag } from "@buildingai/db/entities";
import type { FindOptionsWhere } from "@buildingai/db/typeorm";
import { In, Like, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { CreateTagDto, QueryTagDto, UpdateTagDto } from "@modules/tag/dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TagService extends BaseService<Tag> {
    /**
     * Constructor
     */
    constructor(@InjectRepository(Tag) private readonly tagRepository: Repository<Tag>) {
        super(tagRepository);
    }

    /**
     * Create a tag
     *
     * @param createTagDto DTO for creating a tag
     * @returns Created tag
     */
    async createTag(createTagDto: CreateTagDto): Promise<Partial<Tag>> {
        // Ensure unique name within type
        const existingTag = await this.tagRepository.findOne({
            where: {
                name: createTagDto.name,
                type: createTagDto.type || TagType.APP,
            },
        });

        if (existingTag) {
            throw HttpErrorFactory.badRequest("A tag with the same name already exists");
        }

        // Set default type
        const tagData = {
            ...createTagDto,
            type: createTagDto.type || TagType.APP,
        };

        return super.create(tagData);
    }

    /**
     * Query tag list
     *
     * @param queryTagDto DTO for querying tags
     * @returns Tag list
     */
    async list(queryTagDto: QueryTagDto): Promise<Tag[]> {
        const { name, type } = queryTagDto;

        // Build where conditions
        const where: FindOptionsWhere<Tag> = {};

        if (name) {
            where.name = Like(`%${name}%`);
        }

        if (type) {
            where.type = type;
        }

        // Query tag list
        return this.tagRepository.find({
            where,
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Update a tag by id
     *
     * @param id Tag id
     * @param updateTagDto DTO for updating a tag
     * @returns Updated tag
     */
    async updateTagById(id: string, updateTagDto: UpdateTagDto): Promise<Partial<Tag>> {
        // Ensure tag exists
        const tag = await this.tagRepository.findOne({
            where: { id },
        });

        if (!tag) {
            throw HttpErrorFactory.notFound(`Tag ${id} does not exist`);
        }

        // If name or type changes, ensure uniqueness constraint
        if (updateTagDto.name || updateTagDto.type) {
            const name = updateTagDto.name || tag.name;
            const type = updateTagDto.type || tag.type;

            const existingTag = await this.tagRepository.findOne({
                where: {
                    name,
                    type,
                },
            });

            if (existingTag && existingTag.id !== id) {
                throw HttpErrorFactory.badRequest(
                    "A tag with the same name and type already exists",
                );
            }
        }

        // Update tag
        return super.updateById(id, updateTagDto);
    }

    /**
     * Get tags by type
     *
     * @param type Tag type
     * @returns Tag list
     */
    async getTagsByType(type: TagTypeType): Promise<Tag[]> {
        return this.tagRepository.find({
            where: { type },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Increase tag binding count
     *
     * @param id Tag id
     * @param count Increment value, default 1
     */
    async incrementBindingCount(id: string, count: number = 1): Promise<void> {
        const tag = await this.tagRepository.findOne({
            where: { id },
        });

        if (!tag) {
            throw HttpErrorFactory.notFound(`Tag ${id} does not exist`);
        }

        tag.incrementBindingCount(count);
        await this.tagRepository.save(tag);
    }

    /**
     * Decrease tag binding count
     *
     * @param id Tag id
     * @param count Decrement value, default 1
     */
    async decrementBindingCount(id: string, count: number = 1): Promise<void> {
        const tag = await this.tagRepository.findOne({
            where: { id },
        });

        if (!tag) {
            throw HttpErrorFactory.notFound(`Tag ${id} does not exist`);
        }

        tag.decrementBindingCount(count);
        await this.tagRepository.save(tag);
    }

    /**
     * Batch delete tags
     *
     * @param ids Tag ids
     * @returns void
     */
    async batchDelete(ids: string[]): Promise<void> {
        // Ensure not used (bindingCount > 0)
        const tags = await this.tagRepository.find({
            where: { id: In(ids) },
        });

        const usedTags = tags.filter((tag) => tag.hasBindings());

        if (usedTags.length > 0) {
            throw HttpErrorFactory.badRequest(
                `Cannot delete, the following tags are in use: ${usedTags
                    .map((t) => t.name)
                    .join(", ")}`,
            );
        }

        // Delete in batch
        await this.deleteMany(ids);
    }
}
