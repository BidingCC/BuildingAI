# @buildingai/upload

目前此模块 export 的三个函数签名均保持与原来的 `apiUploadFiles` / `apiUploadRemoteFile` / `apiUploadFile`  这三个 API 保持一致 

## 功能

- 🚀 **自适应存储**：根据配置自动选择本地存储或云存储
- 📦 **适配多存储**：逐步支持阿里云 OSS、腾讯云 COS、七牛云 KODO

## API

## 使用示例

### 单文件上传

```typescript
import { uploadFileAdaptive } from '@buildingai/upload';

// 基础用法
const response = await uploadFileAdaptive({
  file: selectedFile,
  description: '文件描述',
  extensionId: 'optional-extension-id'
});

console.log('上传成功:', response.url);

// 带进度监听
const response = await uploadFileAdaptive(
  {
    file: selectedFile,
    description: '文件描述'
  },
  {
    onProgress: (percent) => {
      console.log(`上传进度: ${percent}%`);
    }
  }
);
```

### 多文件上传

```typescript
import { uploadFilesAdaptive } from '@buildingai/upload';

const responses = await uploadFilesAdaptive(
  {
    files: [file1, file2, file3],
    description: '批量上传',
    extensionId: 'optional-extension-id'
  },
  {
    onProgress: (percent) => {
      console.log(`整体进度: ${percent}%`);
    }
  }
);
```

### 远程文件上传

```typescript
import { uploadRemoteFileAdaptive } from '@buildingai/upload';

// 从远程 URL 上传文件到存储
const response = await uploadRemoteFileAdaptive({
  url: 'https://example.com/path/to/file.pdf',
  description: '从远程服务器导入的文件'
});

console.log('上传成功:', response.url);
```


### 存储类型管理

```typescript
import { useStorageStore } from '@buildingai/upload';

const storageStore = useStorageStore();

// 检查当前存储类型
const storageType = await storageStore.checkStorageType();

// 手动更新存储类型
storageStore.updateStorageType(StorageType.OSS);

// 获取 OSS 签名（用于直传）
const signature = await storageStore.getOSSSignature({
  name: 'file.pdf',
  size: 1024000,
  extensionId: 'optional-id'
});

// 清除缓存
storageStore.clearCache();
```

## API 文档

### uploadFileAdaptive(params, options?)

单文件自适应上传

**参数：**

- `params: FileUploadParams`
    - `file: File` - 要上传的文件对象
    - `description?: string` - 文件描述
    - `extensionId?: string` - 插件 ID（可选）

- `options?: object`
    - `onProgress?: (percent: number) => void` - 进度回调函数

**返回值：** `Promise<FileUploadResponse>`

### uploadFilesAdaptive(params, options?)

多文件自适应上传

**参数：**

- `params: FilesUploadParams`
    - `files: File[]` - 要上传的文件数组
    - `description?: string` - 文件描述
    - `extensionId?: string` - 插件 ID（可选）

- `options?: object`
    - `onProgress?: (percent: number) => void` - 整体进度回调函数

**返回值：** `Promise<FileUploadResponse[]>`

### uploadRemoteFileAdaptive(params)

从远程 URL 上传文件到存储系统。

**参数：**

- `params: object`
    - `url: string` - 远程文件的 URL 地址
    - `description?: string` - 文件描述

**返回值：** `Promise<FileUploadResponse>`

**说明：**

- **LOCAL 存储**：服务器直接从远程 URL 下载并保存文件
- **云存储**：客户端先通过 `fetch` 下载文件为 Blob，然后上传到云存储

**注意事项：**

- 确保远程 URL 可访问且支持 CORS（对于云模式）
- 文件名会从 URL 路径中自动提取
- 大文件可能会占用较多内存（OSS 模式下需要先下载到客户端）

### useStorageStore()

获取存储管理 store 实例。

**方法：**

- `checkStorageType(): Promise<StorageTypeType>` - 检查并返回当前存储类型
- `updateStorageType(storageType: StorageTypeType): void` - 更新存储类型
- `getOSSSignature(params: SignatureParams): Promise<SignatureResponse>` - 获取 OSS 上传签名
- `clearCache(): void` - 清除存储类型缓存

## 架构说明

### 目录结构

```
src/
├── adapter/           # 上传适配器
│   ├── single.ts      # 单文件上传
│   ├── multiple.ts    # 多文件上传
│   └── remote.ts      # 远程文件上传
├── engines/           # 云存储引擎
│   ├── oss.ts         # 阿里云 OSS
│   ├── cos.ts         # 腾讯云 COS
│   └── kodo.ts        # 七牛云 KODO
├── store.ts           # Pinia 状态管理
├── types.ts           # TypeScript 类型定义
├── utils.ts           # 工具函数
└── index.ts           # 入口文件
```

### 存储类型

- `LOCAL` - 本地存储（直接上传到服务器）
- `OSS` - 阿里云
- `COS` - 腾讯云（暂不支持）
- `KODO` - 七牛云（暂不支持）

### 工作流程

1. 调用上传函数时，首先检查当前存储类型
2. 如果未缓存，通过 API 获取激活的存储配置
3. 根据存储类型选择对应的上传策略：
    - **LOCAL**：直接通过 HTTP 表单上传到服务器
    - **[云存储类型]**：获取签名后直传到云存储

### 云存储直传流程

对于云存储（OSS/COS/KODO），采用客户端直传方式：

1. 向服务器请求上传签名和临时凭证
2. 使用签名构造 FormData
3. 直接上传到云存储服务
4. 返回文件的 URL 和元数据

## 注意事项

1. **存储类型缓存**：首次调用时会自动获取并缓存存储类型，后续调用直接使用缓存
2. **错误处理**：所有上传操作都包含错误捕获，失败时会在控制台输出详细错误信息
3. **签名有效期**：云存储签名有***时效性(10分钟)***，过期后需要重新获取（目前每次上传都会获取一次签名）

## 最佳实践

### 1. 处理上传错误

```typescript
try {
  const response = await uploadFileAdaptive({ file });
  console.log('上传成功:', response);
} catch (error) {
  console.error('上传失败:', error);
  // 显示用户友好的错误提示
}
```

### 2. 显示上传进度

```typescript
const [progress, setProgress] = useState(0);

await uploadFileAdaptive(
  { file },
  {
    onProgress: (percent) => {
      setProgress(percent);
    }
  }
);
```

### 3. 清除缓存时机

```typescript
// 当用户切换账号或存储配置变更时
const storageStore = useStorageStore();
storageStore.clearCache();
```
