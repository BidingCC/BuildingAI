import { DictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { SYSTEM_CONFIG, SYSTEM_ID_CONFIG_KEY } from "@common/constants";
import { machineIdSync } from "node-machine-id";

/**
 * 获取持久化的系统 ID。
 *
 * 首次缺失时才根据当前机器生成并写入 config 表，后续调用统一从数据库读取。
 */
export async function getOrCreateSystemId(dictService: DictService): Promise<string> {
    const storedSystemId = await dictService.get<string | null>(
        SYSTEM_ID_CONFIG_KEY,
        null,
        SYSTEM_CONFIG,
    );

    if (storedSystemId && String(storedSystemId).trim()) {
        return String(storedSystemId).trim();
    }

    const generatedSystemId = machineIdSync(true)?.trim();

    if (!generatedSystemId) {
        throw HttpErrorFactory.badRequest("Generated system ID is empty");
    }

    try {
        await dictService.set(SYSTEM_ID_CONFIG_KEY, generatedSystemId, {
            group: SYSTEM_CONFIG,
            description: "系统唯一 ID",
        });
    } catch (error) {
        const latestSystemId = await dictService.get<string | null>(
            SYSTEM_ID_CONFIG_KEY,
            null,
            SYSTEM_CONFIG,
        );

        if (latestSystemId && String(latestSystemId).trim()) {
            return String(latestSystemId).trim();
        }

        throw error;
    }

    return generatedSystemId;
}
