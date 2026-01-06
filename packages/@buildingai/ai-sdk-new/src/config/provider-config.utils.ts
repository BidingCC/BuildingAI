import * as fse from "fs-extra";
import * as path from "path";

import { ProviderConfig } from "./provider-config.types";

export class ProviderConfigUtils {
    private static readonly PROVIDERS_DIR = path.join(__dirname, "providers");

    public static getAllProviderConfigs(): ProviderConfig[] {
        try {
            if (!fse.pathExistsSync(this.PROVIDERS_DIR)) {
                console.warn(`供应商配置目录不存在: ${this.PROVIDERS_DIR}`);
                return [];
            }

            const files = fse.readdirSync(this.PROVIDERS_DIR);
            const configFiles = files.filter((file: string) => file.endsWith(".config.json"));
            const providerConfigs: ProviderConfig[] = [];

            for (const file of configFiles) {
                try {
                    const filePath = path.join(this.PROVIDERS_DIR, file);
                    const config: ProviderConfig = fse.readJsonSync(filePath);

                    providerConfigs.push(config);
                } catch (error) {
                    console.error(`读取供应商配置文件失败: ${file}`, error);
                }
            }

            return providerConfigs;
        } catch (error) {
            console.error("获取供应商配置失败", error);
            return [];
        }
    }

    public static getProviderConfig(providerName: string): ProviderConfig | undefined {
        const allConfigs = this.getAllProviderConfigs();
        return allConfigs.find((config) => config.provider === providerName);
    }

    public static getAllModelConfigs(): ProviderConfig[] {
        return this.getAllProviderConfigs();
    }
}
