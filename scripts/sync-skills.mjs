import { existsSync, readdirSync, statSync, copyFileSync, rmSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const rootDir = resolve(__dirname, "..");

/**
 * Target directories for skills synchronization
 */
const TARGET_DIRS = [
    ".agent/skills",
    ".agents/skills",
    ".gemini/skills",
    ".kiro/skills",
    ".trae/skills",
    ".windsurf/skills",
    ".cursor/skills",
];

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
 * Sync a single skill to all target directories
 * @param {string} skillName - Name of the skill to sync
 */
function syncSkill(skillName) {
    const sourcePath = join(SOURCE_DIR, skillName);

    if (!existsSync(sourcePath)) {
        console.log(chalk.red(`❌ Skill "${skillName}" not found in ${SOURCE_DIR}`));
        process.exit(1);
    }

    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`📦 Syncing skill: ${chalk.bold(skillName)}`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    let successCount = 0;
    let failCount = 0;

    for (const targetDir of TARGET_DIRS) {
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
        console.log(chalk.green(`✓ Successfully synced "${skillName}" to ${successCount} directory(ies)`));
    } else {
        console.log(chalk.yellow(`⚠ Synced "${skillName}" to ${successCount} directory(ies), ${failCount} failed`));
    }
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
}

/**
 * Sync all skills to all target directories
 */
function syncAllSkills() {
    const skills = getAllSkills();

    if (skills.length === 0) {
        console.log(chalk.yellow(`⚠ No skills found in ${SOURCE_DIR}`));
        return;
    }

    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`📦 Syncing all skills (${skills.length} found)`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    for (const skillName of skills) {
        syncSkill(skillName);
        console.log("");
    }

    console.log(chalk.green(`✓ All skills synced successfully`));
}

/**
 * Remove a single skill from all target directories
 * @param {string} skillName - Name of the skill to remove
 */
function removeSkill(skillName) {
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`🗑️  Removing skill: ${chalk.bold(skillName)}`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    let successCount = 0;
    let failCount = 0;

    for (const targetDir of TARGET_DIRS) {
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
        console.log(chalk.green(`✓ Successfully removed "${skillName}" from ${successCount} directory(ies)`));
    } else {
        console.log(chalk.yellow(`⚠ Removed "${skillName}" from ${successCount} directory(ies), ${failCount} failed`));
    }
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
}

/**
 * Remove all skills from all target directories
 */
function removeAllSkills() {
    const skills = getAllSkills();

    if (skills.length === 0) {
        console.log(chalk.yellow(`⚠ No skills found in ${SOURCE_DIR}`));
        return;
    }

    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.blue(`🗑️  Removing all skills (${skills.length} found)`));
    console.log(chalk.blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log("");

    for (const skillName of skills) {
        removeSkill(skillName);
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
        console.log(chalk.white("  pnpm skills sync <skill-name>    - Sync a specific skill"));
        console.log(chalk.white("  pnpm skills sync all             - Sync all skills"));
        console.log(chalk.white("  pnpm skills remove <skill-name>  - Remove a specific skill"));
        console.log(chalk.white("  pnpm skills remove all           - Remove all skills"));
        process.exit(1);
    }

    const command = args[0];
    const target = args[1];

    if (command === "sync" || command === "async") {
        if (target === "all") {
            syncAllSkills();
        } else {
            syncSkill(target);
        }
    } else if (command === "remove") {
        if (target === "all") {
            removeAllSkills();
        } else {
            removeSkill(target);
        }
    } else {
        console.log(chalk.red(`❌ Unknown command: ${command}`));
        console.log(chalk.yellow("Available commands: sync, async, remove"));
        process.exit(1);
    }
}

main();
