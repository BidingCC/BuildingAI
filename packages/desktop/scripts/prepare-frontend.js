import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tauriConfigPath = resolve(__dirname, '../src-tauri/tauri.conf.json')
const publicWebPath = resolve(__dirname, '../../../public/web')
const customIconsPath = resolve(__dirname, '../../../storage/desktop_icons')
const tauriIconsPath = resolve(__dirname, '../src-tauri/icons')

const config = JSON.parse(readFileSync(tauriConfigPath, 'utf-8'))
const currentFrontendDist = config.build.frontendDist

// Skip if frontendDist is a remote URL
const isRemoteUrl = /^https?:\/\//i.test(currentFrontendDist)

if (isRemoteUrl) {
    console.log(`[prepare-frontend] frontendDist is remote URL: ${currentFrontendDist}, skipping...`)
} else {
    // Fallback to public/ if public/web/ does not exist
    const frontendDist = existsSync(publicWebPath) ? '../../../public/web' : '../../../public'

    if (currentFrontendDist !== frontendDist) {
        config.build.frontendDist = frontendDist
        writeFileSync(tauriConfigPath, JSON.stringify(config, null, 4) + '\n')
        console.log(`[prepare-frontend] frontendDist set to: ${frontendDist}`)
    } else {
        console.log(`[prepare-frontend] frontendDist already set to: ${frontendDist}`)
    }
}

// Override icons from storage/desktop_icons if exists
if (existsSync(customIconsPath)) {
    const files = readdirSync(customIconsPath)
    const iconFiles = files.filter(f => /\.(png|ico|icns)$/i.test(f))

    if (iconFiles.length > 0) {
        for (const file of iconFiles) {
            const src = resolve(customIconsPath, file)
            const dest = resolve(tauriIconsPath, file)
            copyFileSync(src, dest)
            console.log(`[prepare-frontend] icon copied: ${file}`)
        }
        console.log(`[prepare-frontend] ${iconFiles.length} custom icon(s) applied`)
    }
}
