
对于任意 block 应遵循以下目录结构（Draft）

```
blocks/
└── [block-name]/
    ├── index.ts                  # 导出
    ├── [block-name].types.ts     # 类型定义
    ├── [block-name].block.ts     # Block 类
    ├── [block-name].node.tsx     # Node 组件
    └── [block-name].panel.tsx    # Panel 组件
```

template

```text
// 1. 类型定义
export interface [BlockName]Data {
  // 定义数据结构
}

// 2. Node 组件
export const [BlockName]NodeComponent: FunctionComponent<
  BlockNodeProps<[BlockName]Data>
> = ({ data }) => {
  return <div>{/* 节点展示内容 */}</div>;
};

// 3. Panel 组件
export const [BlockName]PanelComponent: FunctionComponent<
  BlockPanelProps<[BlockName]Data>
> = ({ data, onDataChange }) => {
  return <div>{/* 编辑表单 */}</div>;
};

// 4. Block 类
export class [BlockName]Block extends BlockBase<[BlockName]Data> {
  constructor() {
    super({
      type: "[block-type]",
      label: "[显示名称]",
      description: "[描述]",
      category: "[分类]",
      icon: "[图标]",
      defaultData: () => ({
        // 默认数据
      }),
      handles: {
        target: true,
        source: true,
      },
    });
  }

  get NodeComponent() {
    return [BlockName]NodeComponent;
  }

  get PanelComponent() {
    return [BlockName]PanelComponent;
  }

  validate(data: [BlockName]Data) {
    // 验证逻辑
    return { valid: true };
  }
}
```
