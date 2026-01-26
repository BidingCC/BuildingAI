# BuildingAI Desktop

BuildingAI desktop application, built with Tauri.

> To start building with Tauri, you first need to install some prerequisites:
>
> 1. [System dependencies](#system-dependencies)
> 2. [Rust](#rust)

## System dependencies

Click the link that matches your operating system to start configuring the environment:

- [Linux](#linux) (see below for distro-specific notes)
- [macOS Catalina (10.15) or newer](#macos)
- [Windows 7 or newer](#windows)

### Linux

Tauri development on Linux requires various system dependencies. These may vary depending on your
distribution, but we provide some common examples below to help you set things up.

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

If your distribution is not listed above, you may want to check
[Awesome Tauri on GitHub](https://github.com/tauri-apps/awesome-tauri#guides) to see if there is
already a guide available.

Next step: [Download and install Rust](#rust)

### macOS

Tauri uses [Xcode](https://developer.apple.com/xcode/resources/) and various macOS and iOS
development dependencies.

Download and install Xcode from one of the following locations:

- [Mac App Store](https://apps.apple.com/app/xcode/id497799835?mt=12)
- [Apple Developer website](https://developer.apple.com/xcode/resources/)

Be sure to launch Xcode after installation so it can complete its setup.

<details>
<summary>Only targeting desktop?</summary>
If you only plan to develop desktop applications and do not target iOS, you can instead install the Xcode Command Line Tools:

```sh
xcode-select --install
```

</details>

Next step: [Download and install Rust](#rust)

### Windows

Tauri uses the Microsoft C++ Build Tools and Microsoft Edge WebView2, both of which are required for
development on Windows.

Follow the steps below to install the required dependencies.

#### Microsoft C++ Build Tools

1. Download the
   [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) installer
   and open it to start the installation.
2. During setup, select the "Desktop development with C++" workload.

![Visual Studio C++ Build Tools installer screenshot](./../../assets/docs/desktop/visual-studio-build-tools-installer.webp)

Next step: [Download and install WebView2](#webview2).

#### WebView2

> 💡 Tip
>
> WebView2 is already installed on Windows 10 (version 1803 and later) and newer versions of
> Windows. If you are developing on one of these versions, you can skip this step and go directly to
> [Download and install Rust](#rust).

Tauri uses Microsoft Edge WebView2 to render content on Windows.

Install WebView2 by visiting
[Download the WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/#download).
Download and install the "Evergreen Bootstrapper".

Next step: [Download and install Rust](#rust)

## Rust

Tauri is built with [Rust](https://www.rust-lang.org/) and requires it for development. Install Rust
using one of the following methods. You can find more installation options at
https://www.rust-lang.org/tools/install.

**> Linux and macOS**

Install using [`rustup`](https://github.com/rust-lang/rustup):

```sh
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

> 💡 Tip
>
> We have reviewed this bash script, and it does what it claims to do. Nevertheless, it is always a
> good idea to inspect scripts before running them blindly. You can view the script as plain text
> here: [rustup.sh](https://sh.rustup.rs/)

**> Windows**

Go to https://www.rust-lang.org/tools/install and download `rustup`.

Alternatively, you can install `rustup` via `winget` in PowerShell:

```powershell
winget install --id Rustlang.Rustup
```

> ⚠️ Warning
>
> To fully support Tauri and tools like [`trunk`](https://trunkrs.dev/), make sure to select the
> MSVC Rust toolchain as the `default host triple` in the installer dialog. Depending on your
> system, it should be `x86_64-pc-windows-msvc`, `i686-pc-windows-msvc`, or
> `aarch64-pc-windows-msvc`. If you have already installed Rust, you can ensure the correct
> toolchain is selected by running:
>
> ```powershell
> rustup default stable-msvc
> ```

**Be sure to restart your terminal (and in some cases your system) for the changes to take effect.**

Next step: If you want to develop for Android or iOS, go to the mobile setup docs. Otherwise, if you
plan to use a JavaScript frontend framework, go to [Node.js](#nodejs). If not, you can proceed to
create a new project directly.

## Node.js

> 💡 Tip
>
> Only required if you plan to use a JavaScript frontend framework.

1. Visit the [Node.js website](https://nodejs.org/), download, and install the Long-Term Support
   (LTS) version.

2. Run the following commands to verify that Node.js was installed successfully:

```sh
node -v
# v20.10.0
npm -v
# 10.2.3
```

It is important to restart your terminal so it can recognize the newly installed tools. In some
cases, you may need to restart your computer.

Although npm is the default package manager for Node.js, you can also use other package managers
such as pnpm or yarn. If you want to enable these package managers, run `corepack enable` in your
terminal. This step is optional and only needed if you want to use a package manager other than npm.

Next step: mobile setup or creating a new project.

## Troubleshooting

If you run into any issues during installation, please refer to the official Tauri
[debugging guide](/develop/debug/) or ask for help in the
[Tauri Discord](https://discord.com/invite/tauri).

Now that you have installed all prerequisites, you can try running or bundling the desktop
application locally.

### Run locally

```bash
pnpm dev:desktop
```

### Build / bundle

Note: You can only build installers for the platform you are currently on. For example, on macOS you
can only build `.dmg` or `.zip` files, and on Windows you can only build `.exe` files.

For more details, see the [build guide](./build.md).

```bash
pnpm build:desktop
```
