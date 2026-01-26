## Build Desktop

**💡Tips: Build artifact paths**

| Platform | Build artifact path |
| --- | --- |
| Windows | [Project Root]/packages/desktop/src-tauri/target/release/bundle/msi/xxx.msi |
| Windows | [Project Root]/packages/desktop/src-tauri/target/release/bundle/nsis/xxx.exe |
| macOS | [Project Root]/packages/desktop/src-tauri/target/release/bundle/dmg/xxx.dmg |

> If macOS says the app package is damaged, run `sudo xattr -r -d com.apple.quarantine [package-path]` in Terminal, then enter your password and press Enter to open it again.

## Update icons

Official icon generation tool:

```bash
# Install
npm install -g icns-generator

# Verify installation
icns-generator --version
# If it prints a version like 1.1.x, the installation is successful

# Create a folder and put your icon (png/jpg/jpeg) into it
# Example: create a folder named icons, and put icon.png into it
# Then enter the icons folder in your terminal
cd icons

# Generate
icns-generator --input icon.png
```

After running the commands above, an `output` folder will be generated. The directory structure looks like this:

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
    <File name="icon.icns (macOS only; not generated on Windows)" />
  </Folder>
</Files>

Copy the files below into `[Project Root]/packages/desktop/src-tauri/icons` to replace the default icons:

- `icon.ico`
- `icon.icns` (not required on Windows)
- `icon_32x32.png`
- `icon_128x128.png`
- `icon_128x128@2x.png`

After updating the icons, rebuild to apply changes:

```bash
pnpm build:desktop
```

---

## Change window title and product name

If you want to modify the desktop app window title (and product name):

1. Edit `src-tauri/tauri.conf.json`:

```jsonc
{
    "productName": "BuildingAI",
    "app": {
        "windows": [
            {
                "title": "BuildingAI"
            }
        ]
    }
}
```

- Change `productName` to update the app name used by the installer and system.
- Change `app.windows[0].title` to update the main window title shown in the title bar.

After editing the config, rebuild the desktop app:

```bash
pnpm build:desktop
```

---

## Bundle a deployed website (remote URL)

If you want the desktop app to open an already deployed website (for example,
`https://your-production-url`):

1. Edit `src-tauri/tauri.conf.json`:

```jsonc
{
    "build": {
        "devUrl": "http://localhost:4090",
        "frontendDist": "https://your-production-url",
        "beforeDevCommand": "pnpm run prepare",
        "beforeBuildCommand": "pnpm run prepare",
    },
}
```

2. Run:

```bash
pnpm build:desktop
```

In this case `frontendDist` is a URL. The `prepare-frontend.js` script **skips any change** and uses
the remote URL as-is.

---

## Bundle local static assets

If you want to package the built frontend assets into the desktop app:

1. Set `frontendDist` in `src-tauri/tauri.conf.json` to a local directory path, for example:

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

2. Run:

```bash
pnpm build:desktop
```

In this case `frontendDist` is a local directory. The `prepare-frontend.js` script will
automatically choose between `public/web` and `public`, and write the final value back to the config
file.

---

## Project configuration (`tauri.conf.json`)

The desktop app is configured through `src-tauri/tauri.conf.json`. The main fields are:

- **`$schema`**: URL of the Tauri config schema used for IDE validation and auto-completion.
- **`productName`**: Product name of the desktop app, used by the system and installer.
- **`version`**: Application version string.
- **`identifier`**: Unique application identifier (similar to bundle id), e.g. `buildingai.desktop`.
- **`build.devUrl`**: URL loaded in development mode (typically the local dev server).
- **`build.frontendDist`**: 
  - Remote URL when you want to open an already deployed website.
  - Local directory path when you want to bundle static assets into the app.
- **`build.beforeDevCommand`**: Command run before starting the dev server (e.g. prepare frontend).
- **`build.beforeBuildCommand`**: Command run before building the desktop bundle.
- **`app.windows`**: List of window definitions:
  - `title`: Window title.
  - `width` / `height`: Initial window size.
  - `minWidth` / `minHeight`: Minimum resize constraints.
  - `devtools`: Whether devtools are enabled in dev builds.
  - `center`: Whether to center the window on startup.
- **`app.security.csp`**: Content Security Policy; `null` means use Tauri defaults.
- **`bundle.active`**: Whether bundling (creating installers) is enabled.
- **`bundle.targets`**: Bundle targets (e.g. `all` to build for all supported platforms).
- **`bundle.icon`**: Icon files for different platforms and resolutions.

Adjust these fields as needed, then run `pnpm build:desktop` to rebuild the desktop app.
