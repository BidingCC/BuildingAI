# BuildingAI Desktop

BuildingAI 桌面端应用，基于 Tauri 构建。

> 为了开始使用 Tauri 构建项目，你首先需要安装一些依赖项：

1. [系统依赖项](#系统依赖项)
2. [Rust](#rust)

## 系统依赖项

点击链接开始配置，适用于你使用的操作系统：

- [Linux](#linux) （特定发行版请参考下文）
- [macOS Catalina (10.15) 或更新](#macos)
- [Windows 7 或更新](#windows)

### Linux

Tauri 在 Linux 上进行开发需要各种系统依赖项。这些可能会有所不同，具体取决于你的发行版，但我们在下面提供了一些流行的发行版来帮助你进行设置。

> Debian

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

> Arch

```sh
sudo pacman -Syu
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  librsvg \
  xdotool
```

> Fedora

```sh
sudo dnf check-update
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  libxdo-devel
sudo dnf group install "c-development"
```

> Gentoo

```sh
sudo emerge --ask \
  net-libs/webkit-gtk:4.1 \
  dev-libs/libappindicator \
  net-misc/curl \
  net-misc/wget \
  sys-apps/file
```

> openSUSE

```sh
sudo zypper up
sudo zypper in webkit2gtk3-devel \
  libopenssl-devel \
  curl \
  wget \
  file \
  libappindicator3-1 \
  librsvg-devel
sudo zypper in -t pattern devel_basis
```

> Alpine

```sh
sudo apk add \
  build-base \
  webkit2gtk \
  curl \
  wget \
  file \
  openssl \
  libayatana-appindicator-dev \
  librsvg
```

如果你的发行版未包含在上面，那么你可能需要查阅
[Awesome Tauri on GitHub](https://github.com/tauri-apps/awesome-tauri#guides)
以获知是否已有指南被创建。

下一步：[下载并安装 Rust](#rust)

### macOS

Tauri 使用 [Xcode](https://developer.apple.com/cn/xcode/resources/)
以及各种 macOS 和 iOS 开发依赖项。

从以下位置之一下载并安装 Xcode：

- [Mac App Store](https://apps.apple.com/cn/app/xcode/id497799835?mt=12)
- [Apple Developer 网站](https://developer.apple.com/cn/xcode/resources/).

请务必在安装后启动 Xcode，以使它完成设置。

<details>
<summary>仅针对桌面目标进行开发？</summary>
如果你只打算开发桌面应用程序而不针对 iOS，那么你可以改为安装 Xcode 命令行工具：

```sh
xcode-select --install
```

</details>

下一步：[下载并安装 Rust](#rust)

### Windows

Tauri 使用 Microsoft C++ 生成工具进行开发以及 Microsoft Edge
WebView2。这两者都是在 Windows 上进行开发所必需的。

按照以下步骤安装所需的依赖项。

#### Microsoft C++ 生成工具

1. 下载 [Microsoft C++ 生成工具](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/)
   安装程序并打开它以开始安装。
2. 在安装过程中，选中“使用 C++ 的桌面开发”选项。

![Visual Studio C++ 生成工具 安装程序 截图](./../../assets/docs/desktop/visual-studio-build-tools-installer.webp)

下一步：[下载并安装 WebView2](#webview2).

#### WebView2

> 💡提示
>
> WebView 2 已安装在 Windows
> 10（从版本 1803 开始）和更高版本的 Windows 上。如果你正在这些版本之一上进行开发，则可以跳过此步骤，并直接转到
> [下载并安装 Rust](#rust)。

Tauri 使用 Microsoft Edge WebView2 在 Windows 上呈现内容。

通过访问[下载 WebView2 运行时](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/#download)安装 WebView2。下载并安装“常青独立安装程序（Evergreen
Bootstrapper）”。

下一步：[下载并安装 Rust](#rust)

## Rust

Tauri 使用 [Rust](https://www.rust-lang.org/zh-CN/)
构建并需要它进行开发。使用以下方法之一安装 Rust。你可以在
https://www.rust-lang.org/zh-CN/tools/install 查看更多安装方法。

**> Linux and macOS**

使用 [`rustup`](https://github.com/rust-lang/rustup) 安装：

```sh
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

> 💡提示
>
> 我们已经审核了这个 bash 脚本，它做了它所说的应该做的事情。尽管如此，在盲目地使用脚本之前，先看一看总是明智的。以下是作为纯文本的脚本文件：[rustup.sh](https://sh.rustup.rs/)

**> Windows**

前往 https://www.rust-lang.org/zh-CN/tools/install 下载 `rustup`。

或者，你可以在 PowerShell 中使用 `winget` 安装 rustup：

```powershell
winget install --id Rustlang.Rustup
```

> ⚠️警告
>
> 为了完全支持 Tauri 和 [`trunk`](https://trunkrs.dev/) 等工具，请确保在安装程序对话框中的
> `default host triple` 选择 MSVC Rust 工具链。根据你的系统，它应该是
> `x86_64-pc-windows-msvc`、`i686-pc-windows-msvc`
> 或 >`aarch64-pc-windows-msvc`。如果你已安装 Rust，你可以通过运行以下命令来确保安装正确的工具链：
>
> ```powershell
> rustup default stable-msvc
> ```

**请务必重新启动终端（在某些情况下重新启动系统）以使更改生效。**

下一步：如果你想要在 Android 或 iOS 上开发应用，前往[移动端配置](#移动端配置)。或者，如果你想使用 JavaScript 前端框架，前往[安装 Node](#nodejs)。否则，前往[创建新项目](/zh-cn/start/create-project/)。

## Node.js

> 💡提示
>
> 仅当你打算使用 JavaScript 前端框架时

1. 访问 [Node.js 网站](https://nodejs.org/zh-cn)，下载并安装长期支持版本（LTS）。

2. 运行以下命令以检查 Node 是否成功安装：

```sh
node -v
# v20.10.0
npm -v
# 10.2.3
```

重要的是，重新启动终端以确保它能够识别新安装的内容。在某些情况下，您可能需要重新启动计算机。

虽然 npm 是 Node.js 的默认包管理器，但你也可以使用其他包管理器，比如 pnpm 或 yarn。如果你想启用这些包管理器，可以在终端中运行
`corepack enable`。这一步是可选的，只有在您想使用 npm 以外的包管理器时才需要。

下一步：[移动端配置](#移动端配置)或者[创建新项目](/zh-cn/start/create-project/)。

## 故障排除

如果你在安装过程中遇到任何问题，请务必查看[故障诊断指南](/zh-cn/develop/debug/)或联系
[Tauri Discord](https://discord.com/invite/tauri) 以寻求帮助。

现在，你已经安装了所有前置要求，你可以尝试本地运行或打包桌面端应用。

### 本地运行

```bash
pnpm dev:desktop
```

### 打包

注意：当前设备只能打包本设备平台的安装包，例如在 macOS 上只能打包 .dmg 或 .zip 文件，在 Windows 上只能打包 .exe 文件。

详细文档查看 [《打包文档》](./build.zh-CN.md)

```bash
pnpm build:desktop
```
