## Build Desktop

**💡Tips：构建产物路径**

| 平台    | 构建产物路径                                                               |
| ------- | -------------------------------------------------------------------------- |
| Windows | [项目根目录]/packages/desktop/src-tauri/target/release/bundle/msi/xxx.msi  |
| Windows | [项目根目录]/packages/desktop/src-tauri/target/release/bundle/nsis/xxx.exe |
| macOS   | [项目根目录]/packages/desktop/src-tauri/target/release/bundle/dmg/         |

> macOS安装如果提示包已损坏，则在终端中输入`sudo xattr -r -d com.apple.quarantine [安装包路径]`，然后输入密码回车即可重新打开。

## 图标修改

官方图标生成工具：

```bash
# 安装
npm install -g icns-generator

# 检查是否安装成功
icns-generator --version
# 输出版本号 1.1.x 则说明安装成功

# 先创建一个目录，然后把图标(png,jpg,jpeg)放在该目录下
# 例如：创建一个名为icons的目录，然后将名为icon.png的图标放在icons目录下
# 终端进入icons目录
cd icons
# 然后执行
icns-generator --input icon.png
```

执行完上述操作之后，会在该目录下生成一个output目录，其中目录结构如下：

<Files>
  <Folder name="icons" defaultOpen>
    <Folder name="icon.iconset" defaultOpen>
      <File name="icon_32x32.png" />
      <File name="icon_128x128.png" />
      <File name="icon_128x128@2x.png" />
      <File name="icon_xxx.png" />
    </Folder>
    <Folder name="icons" defaultOpen>
      <File name="32x32.png" />
      <File name="128x128.png" />
      <File name="128x128@2x.png" />
      <File name="xxx.png" />
    </Folder>
    <File name="icon.ico" />
    <File name="icon.icns（macOS专属，Windows系统不会生成）" />
  </Folder>
</Files>

复制下面几个文件然后粘贴至 `[项目根目录]/packages/desktop/src-tauri/icons` 目录下替换掉默认图标

- `icon.ico`
- `icon.icns` Windows不需要
- `icon_32x32.png`
- `icon_128x128.png`
- `icon_128x128@2x.png`

修改完成后需要重新构建才能生效：

```bash
pnpm build:desktop
```

---

## 修改窗口标题、应用包名

如果你想修改桌面应用窗口标题（以及应用包名）：

1. 编辑 `src-tauri/tauri.conf.json`：

```jsonc
{
    "productName": "BuildingAI",
    "app": {
        "windows": [
            {
                "title": "BuildingAI",
            },
        ],
    },
}
```

- 修改 `productName` 可以更改系统与安装器里显示的应用名称。
- 修改 `app.windows[0].title` 可以更改窗口标题栏中显示的标题。

修改完成后需要重新构建才能生效：

```bash
pnpm build:desktop
```

---

## 打包线上部署地址

如果想让桌面应用打开一个线上网站（例如 `https://你的项目线上部署地址`）：

1. 编辑 `src-tauri/tauri.conf.json`：

```jsonc
{
    "build": {
        "devUrl": "http://localhost:4090",
        "frontendDist": "https://你的项目线上部署地址",
        "beforeDevCommand": "pnpm run prepare",
        "beforeBuildCommand": "pnpm run prepare",
    },
}
```

2. 执行：

```bash
pnpm build:desktop
```

此时 `frontendDist` 是 URL，`prepare-frontend.js` 会**跳过修改**，直接使用远程地址。

---

## 打包本地静态资源

如果想把前端构建产物一起打包进桌面应用：

1. 设置 `src-tauri/tauri.conf.json` 中的 `frontendDist` 为本地目录路径，例如：

```jsonc
{
    "build": {
        "devUrl": "http://localhost:4090",
        "frontendDist": "../../../public/web",
        "beforeDevCommand": "pnpm run prepare",
        "beforeBuildCommand": "pnpm run prepare",
    },
}
```

2. 执行：

```bash
pnpm build:desktop
```

此时 `frontendDist` 是本地目录，`prepare-frontend.js` 会自动在 `public/web` 和 `public`
之间选择，并写回配置。

---

## 项目配置（`tauri.conf.json`）

桌面应用的核心配置在 `src-tauri/tauri.conf.json` 中，主要字段说明如下：

- **`$schema`**：Tauri 配置的 schema 地址，用于 IDE 校验和自动补全。
- **`productName`**：应用产品名称，安装器和系统中显示的名称。
- **`version`**：应用版本号字符串。
- **`identifier`**：应用唯一标识（类似 bundle id），如 `buildingai.desktop`。
- **`build.devUrl`**：开发模式加载的地址（通常是本地 dev server）。
- **`build.frontendDist`**：
    - 设置为远程 URL 时，桌面应用会直接打开线上网站；
    - 设置为本地目录时，会把静态资源打包到应用中。
- **`build.beforeDevCommand`**：启动开发调试前执行的命令（例如前端预处理）。
- **`build.beforeBuildCommand`**：构建桌面安装包前执行的命令。
- **`app.windows`**：窗口配置列表：
    - `title`：窗口标题。
    - `width` / `height`：初始窗口宽高。
    - `minWidth` / `minHeight`：窗口最小尺寸限制。
    - `devtools`：开发环境是否允许打开 DevTools。
    - `center`：启动时是否居中显示窗口。
- **`app.security.csp`**：Content Security Policy，`null` 表示使用 Tauri 默认策略。
- **`bundle.active`**：是否启用打包（生成安装包）。
- **`bundle.targets`**：打包目标平台（例如 `all` 表示所有支持的平台）。
- **`bundle.icon`**：不同平台和分辨率使用的图标文件列表。

根据需要调整这些字段后，执行 `pnpm build:desktop` 重新构建桌面应用。
