# 插件种子机制使用说明

## 概述

插件种子机制允许插件在首次安装时自动执行数据初始化逻辑，确保插件所需的基础数据被正确创建。

## 目录结构

```
extensions/your-plugin/
├── data/
│   └── .installed          # 插件安装标记文件（自动生成）
├── src/
│   └── api/
│       └── db/
│           └── seeds/
│               ├── index.ts        # 种子入口文件（必须）
│               ├── seeders/        # 种子类目录
│               │   └── *.seeder.ts
│               └── data/           # 种子数据文件
│                   └── *.json
└── build/
    └── api/
        └── db/
            └── seeds/      # 编译后的种子文件（自动生成）
```

## 核心文件

### 1. src/api/db/seeds/index.ts（必须）

种子入口文件，必须导出 `getSeeders` 函数：

```typescript
import { BaseSeeder } from "@buildingai/db/seeds/seeders/base.seeder";
import { YourSeeder } from "./seeders/your.seeder";

/**
 * Extension seed entry
 * Must export getSeeders function
 */
export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new YourSeeder(),
        // 添加更多 seeder
    ];
}
```

### 2. src/api/db/seeds/seeders/\*.seeder.ts

具体的种子类，继承自 `BaseSeeder`：

```typescript
import { BaseSeeder } from "@buildingai/db/seeds/seeders/base.seeder";
import { DataSource } from "@buildingai/db/typeorm";
import { YourEntity } from "../../api/entities/your.entity";

export class YourSeeder extends BaseSeeder {
    readonly name = "YourSeeder";
    readonly priority = 100; // 执行优先级，数字越小越先执行

    /**
     * Check if seeder should run
     */
    async shouldRun(dataSource: DataSource): Promise<boolean> {
        const repository = dataSource.getRepository(YourEntity);
        const count = await repository.count();
        return count === 0; // 只在数据为空时执行
    }

    /**
     * Run seeder
     */
    async run(dataSource: DataSource): Promise<void> {
        const repository = dataSource.getRepository(YourEntity);

        // 从 data 目录加载数据
        const data = await this.loadConfig<YourDataType[]>("your-data.json");

        for (const item of data) {
            const entity = repository.create(item);
            await repository.save(entity);
            this.logInfo(`Inserted: ${entity.name}`);
        }

        this.logSuccess(`Successfully inserted ${data.length} records`);
    }
}
```

### 3. src/api/db/seeds/data/\*.json

种子数据文件，存放初始化数据：

```json
[
    {
        "name": "示例数据",
        "description": "这是一条示例数据"
    }
]
```

## 执行流程

1. **插件安装**：用户通过市场或本地安装插件
2. **文件处理**：下载插件文件、更新配置、复制资源
3. **应用重启**：PM2 重启应用以加载新插件
4. **模块初始化**：应用启动时加载所有插件模块
5. **种子检测**：`ExtensionCoreModule.onModuleInit()` 检查所有插件的 `data/.installed` 文件
6. **首次安装执行**：
    - 如果 `.installed` 不存在，执行种子逻辑
    - 动态加载 `build/api/db/seeds/index.js`
    - 调用 `getSeeders()` 获取所有 seeder
    - 按优先级顺序执行每个 seeder
    - 创建 `.installed` 标记文件
7. **已安装跳过**：如果 `.installed` 存在，跳过种子执行

## BaseSeeder 提供的工具方法

- `loadConfig<T>(fileName: string)`: 加载 JSON 配置文件
- `shouldRun(dataSource: DataSource)`: 判断是否应该执行（可选实现）
- `logSuccess(message: string)`: 记录成功日志
- `logInfo(message: string)`: 记录信息日志
- `logWarn(message: string)`: 记录警告日志
- `logError(message: string)`: 记录错误日志

## 注意事项

1. **入口文件必须存在**：`src/api/db/seeds/index.ts` 是必需的，必须导出 `getSeeders` 函数
2. **幂等性**：通过 `.installed` 文件确保种子只执行一次
3. **优先级**：通过 `priority` 属性控制执行顺序，数字越小越先执行
4. **条件执行**：通过 `shouldRun` 方法实现条件判断，避免重复插入
5. **数据文件路径**：数据文件会自动从 `src/api/db/seeds/data` 复制到 `build/api/db/seeds/data`
6. **执行时机**：种子在应用启动时执行，此时所有插件模块、实体、DataSource 都已就绪
7. **错误处理**：种子执行失败会记录错误日志，但不会阻止应用启动

## 示例

参考 `buildingai-simple-blog` 插件的种子实现：

- `src/api/db/seeds/index.ts` - 种子入口
- `src/api/db/seeds/seeders/category.seeder.ts` - 博客分类种子
- `src/api/db/seeds/data/blog-categories.json` - 分类数据

## 构建

插件构建时，tsup 会自动：

1. 编译 `src/api/**/*.ts`（包括 seeds）到 `build/api/`
2. 复制 `src/api/db/seeds/data/` 到 `build/api/db/seeds/data/`

确保在构建前运行：

```bash
pnpm build:api
```
