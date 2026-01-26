import { existsSync, readdirSync, statSync, copyFileSync, rmSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const rootDir = resolve(__dirname, "..");

/**
 * Editor name to directory mapping
 */
const EDITOR_MAP = {
    agent: ".agent/skills",
    agents: ".agents/skills",
    gemini: ".gemini/skills",
    kiro: ".kiro/skills",
    trae: ".trae/skills",
    windsurf: ".windsurf/skills",
    cursor: ".cursor/skills",
    claude: ".claude/skills",
    vercel: ".vercel/skills",
};

/**
 * Target directories for skills synchronization
 */
const TARGET_DIRS = Object.values(EDITOR_MAP);

/**
 * Source directory for skills
 */
const SOURCE_DIR = join(rootDir, "skills");

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDirectory(src, dest) {
    if (!existsSync(src)) {
        return false;
    }

    // Create destination directory if it doesn't exist
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }

    return true;
}

/**
 * Remove directory recursively
 * @param {string} dir - Directory to remove
 */
function removeDirectory(dir) {
    if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
        return true;
    }
    return false;
}

/**
 * Get all skill names from source directory
 * @returns {string[]}
 */
function getAllSkills() {
    if (!existsSync(SOURCE_DIR)) {
        return [];
    }

    return readdirSync(SOURCE_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
}

/**
 * Get target directories based on editor name
 * @param {string|null} editorName - Editor name (null for all)
 * @returns {string[]}
 */
function getTargetDirs(editorName) {
    if (!editorName) {
        return TARGET_DIRS;
    }
    const editorDir = EDITOR_MAP[editorName.toLowerCase()];
    if (!editorDir) {
        console.log(chalk.red(`❌ Unknown editor: ${editorName}`));
        console.log(chalk.yellow(`Available editors: ${Object.keys(EDITOR_MAP).join(", ")}`));
        process.exit(1);
    }
    return [editorDir];
}

/**
 * Sync a single skill to target directories
 * @param {string} skillName - Name of the skill to sync
 * @param {string|null} editorName - Editor name (null for all)
 */
function syncSkill(skillName, editorName = null) {
    const sourcePath = join(SOURCE_DIR, skillName);

    if (!existsSync(sourcePath)) {
        console.log(chalk.red(`❌ Skill "${skillName}" not found in ${SOURCE_DIR}`));
        process.exit(1);
    }

    const targetDirs = getTargetDirs(editorName);
    const editorInfo = editorName ? ` to ${chalk.bold(editorName)}` : "";

    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`📦 Syncing skill: ${chalk.bold(skillName)}${editorInfo}`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    let successCount = 0;
    let failCount = 0;

    for (const targetDir of targetDirs) {
        const targetPath = join(rootDir, targetDir, skillName);

        try {
            // Remove existing skill if it exists
            if (existsSync(targetPath)) {
                removeDirectory(targetPath);
            }

            // Create target directory
            const targetParent = join(rootDir, targetDir);
            if (!existsSync(targetParent)) {
                mkdirSync(targetParent, { recursive: true });
            }

            // Copy skill directory
            if (copyDirectory(sourcePath, targetPath)) {
                console.log(chalk.green(`  ✓ ${targetDir}/${skillName}`));
                successCount++;
            } else {
                console.log(chalk.yellow(`  ⚠ ${targetDir}/${skillName} (source not found)`));
                failCount++;
            }
        } catch (error) {
            console.log(chalk.red(`  ✗ ${targetDir}/${skillName} - ${error.message}`));
            failCount++;
        }
    }

    console.log("");
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    if (failCount === 0) {
        console.log(
            chalk.green(`✓ Successfully synced "${skillName}" to ${successCount} directory(ies)`),
        );
    } else {
        console.log(
            chalk.yellow(
                `⚠ Synced "${skillName}" to ${successCount} directory(ies), ${failCount} failed`,
            ),
        );
    }
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
}

/**
 * Sync all skills to target directories
 * @param {string|null} editorName - Editor name (null for all)
 */
function syncAllSkills(editorName = null) {
    const skills = getAllSkills();

    if (skills.length === 0) {
        console.log(chalk.yellow(`⚠ No skills found in ${SOURCE_DIR}`));
        return;
    }

    const editorInfo = editorName ? ` to ${chalk.bold(editorName)}` : "";
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`📦 Syncing all skills (${skills.length} found)${editorInfo}`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    for (const skillName of skills) {
        syncSkill(skillName, editorName);
        console.log("");
    }

    console.log(chalk.green(`✓ All skills synced successfully`));
}

/**
 * Remove a single skill from target directories
 * @param {string} skillName - Name of the skill to remove
 * @param {string|null} editorName - Editor name (null for all)
 */
function removeSkill(skillName, editorName = null) {
    const targetDirs = getTargetDirs(editorName);
    const editorInfo = editorName ? ` from ${chalk.bold(editorName)}` : "";

    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`🗑️  Removing skill: ${chalk.bold(skillName)}${editorInfo}`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    let successCount = 0;
    let failCount = 0;

    for (const targetDir of targetDirs) {
        const targetPath = join(rootDir, targetDir, skillName);

        try {
            if (removeDirectory(targetPath)) {
                console.log(chalk.green(`  ✓ Removed ${targetDir}/${skillName}`));
                successCount++;
            } else {
                console.log(chalk.yellow(`  ⚠ ${targetDir}/${skillName} (not found)`));
            }
        } catch (error) {
            console.log(chalk.red(`  ✗ ${targetDir}/${skillName} - ${error.message}`));
            failCount++;
        }
    }

    console.log("");
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    if (failCount === 0) {
        console.log(
            chalk.green(
                `✓ Successfully removed "${skillName}" from ${successCount} directory(ies)`,
            ),
        );
    } else {
        console.log(
            chalk.yellow(
                `⚠ Removed "${skillName}" from ${successCount} directory(ies), ${failCount} failed`,
            ),
        );
    }
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
}

/**
 * Remove all skills from target directories
 * @param {string|null} editorName - Editor name (null for all)
 */
function removeAllSkills(editorName = null) {
    const skills = getAllSkills();

    if (skills.length === 0) {
        console.log(chalk.yellow(`⚠ No skills found in ${SOURCE_DIR}`));
        return;
    }

    const editorInfo = editorName ? ` from ${chalk.bold(editorName)}` : "";
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`🗑️  Removing all skills (${skills.length} found)${editorInfo}`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    for (const skillName of skills) {
        removeSkill(skillName, editorName);
        console.log("");
    }

    console.log(chalk.green(`✓ All skills removed successfully`));
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(chalk.red("❌ Invalid arguments"));
        console.log("");
        console.log(chalk.yellow("Usage:"));
        console.log(
            chalk.white(
                "  pnpm skills sync <skill-name>           - Sync a specific skill to all editors",
            ),
        );
        console.log(
            chalk.white(
                "  pnpm skills sync <skill-name> <editor>  - Sync a specific skill to one editor",
            ),
        );
        console.log(
            chalk.white(
                "  pnpm skills sync all                    - Sync all skills to all editors",
            ),
        );
        console.log(
            chalk.white(
                "  pnpm skills sync <editor>               - Sync all skills to one editor",
            ),
        );
        console.log(
            chalk.white(
                "  pnpm skills remove <skill-name>         - Remove a specific skill from all editors",
            ),
        );
        console.log(
            chalk.white(
                "  pnpm skills remove <skill-name> <editor> - Remove a specific skill from one editor",
            ),
        );
        console.log(
            chalk.white(
                "  pnpm skills remove all                  - Remove all skills from all editors",
            ),
        );
        console.log(
            chalk.white(
                "  pnpm skills remove all <editor>         - Remove all skills from one editor",
            ),
        );
        console.log("");
        console.log(chalk.yellow("Available editors:"));
        console.log(chalk.white(`  ${Object.keys(EDITOR_MAP).join(", ")}`));
        process.exit(1);
    }

    const command = args[0];
    const target = args[1];
    const editor = args[2] || null;

    // Check if target is an editor name (when command is sync and no skill exists with that name)
    let actualTarget = target;
    let actualEditor = editor;

    if (command === "sync" && !editor && target !== "all") {
        // Check if target is an editor name
        if (EDITOR_MAP[target.toLowerCase()]) {
            actualTarget = "all";
            actualEditor = target;
        }
    }

    if (command === "sync") {
        if (actualTarget === "all") {
            syncAllSkills(actualEditor);
        } else {
            syncSkill(actualTarget, actualEditor);
        }
    } else if (command === "remove") {
        if (actualTarget === "all") {
            removeAllSkills(actualEditor);
        } else {
            removeSkill(actualTarget, actualEditor);
        }
    } else {
        console.log(chalk.red(`❌ Unknown command: ${command}`));
        console.log(chalk.yellow("Available commands: sync, remove"));
        process.exit(1);
    }
}

main();
