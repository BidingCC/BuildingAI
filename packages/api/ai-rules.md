# BuildingAI API 开发规范

## 技术栈

NestJS + PostgreSQL + TypeORM + Redis，pnpm 包管理，PM2 进程管理，Node >=22.20.x

## 项目结构

### 包结构

- `packages/@buildingai/` - 公共包（base、cache、config、constants、db、decorators、errors、logger、utils等）
- `packages/core/` - 核心模块（可复用业务逻辑）
- `packages/api/` - 业务API模块（本包）

### API包结构

- `src/common/` - 公共模块（constants、decorators、filters、guards、interceptors、interfaces、modules、utils）
- `src/core/` - 核心功能（database、logger、queue）
- `src/modules/` - 业务模块

### 业务模块结构

```
src/modules/{module-name}/
├── {module-name}.module.ts
├── controllers/
│   ├── web/{name}.controller.ts      # 前台接口
│   └── console/{name}.controller.ts  # 后台接口
├── services/{name}.service.ts
├── dto/{action}-{name}.dto.ts
└── interfaces/、handlers/、utils/    # 可选
```

### 路径别名

- `@common/*` → `src/common/*`
- `@modules/*` → `src/modules/*`
- `@core/*` → `src/core/*`
- `@assets/*` → `src/assets/*`

## 控制器规范

### 装饰器

- **后台**: `@ConsoleController(path, groupName)` - 路由前缀 `/consoleapi/`，自动启用认证和权限
- **前台**: `@WebController(path)` - 路由前缀 `/api/`，默认需认证，`skipAuth: true` 可跳过

### 权限

`@Permissions({ code, name, description? })` - 标记接口权限

## 服务规范

继承 `BaseService<Entity>`
获得：`findOne`、`findOneById`、`findAll`、`paginate`、`create`、`updateById`、`delete`、`deleteMany`

## 实体规范

统一从 `@buildingai/db/entities` 导入

## 守卫执行顺序

DemoGuard → AuthGuard → ExtensionGuard → PermissionsGuard → SuperAdminGuard

跳过认证: `skipAuth: true`；跳过权限: `skipPermissionCheck: true`

## 常用装饰器

- `@Playground()` - 获取当前登录用户
- `@BuildFileUrl(["**.avatar"])` - 自动构建文件URL
- `@UUIDValidationPipe` - UUID参数验证

## 错误处理

使用 `HttpErrorFactory`：`notFound()`、`paramError()`、`unauthorized()`、`business(msg, code)`

## 导入顺序

@buildingai/_ → @nestjs/_ → @common/_ → @modules/_ → @core/\* → 第三方包 → 相对路径

## 命名规范

- 文件: `{name}.controller.ts`、`{name}.service.ts`、`{action}-{name}.dto.ts`、`{name}.module.ts`
- 类:
  `{Name}Controller`/`{Name}{Type}Controller`、`{Name}Service`、`{Action}{Name}Dto`、`{Name}Module`

## 注释规范

JSDoc 格式，复杂逻辑处添加英文注释
