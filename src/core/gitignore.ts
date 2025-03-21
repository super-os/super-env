/**
 * Utilities for managing .gitignore entries
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { EOL } from "os";

/**
 * Add entries to a .gitignore file
 * @param entries - The entries to add to the .gitignore file
 * @param gitignorePath - Path to the .gitignore file
 * @returns True if entries were added, false if they were already present
 */
export function addToGitignore(
  entries: string[],
  gitignorePath: string = ".gitignore"
): boolean {
  let gitignoreContent = "";
  let modified = false;

  // Read existing .gitignore or create a new one
  if (existsSync(gitignorePath)) {
    gitignoreContent = readFileSync(gitignorePath, "utf8");
  }

  const lines = gitignoreContent.split(/\r?\n/);
  const entriesSet = new Set(lines);

  // Add each entry if it doesn't already exist
  for (const entry of entries) {
    if (!entriesSet.has(entry)) {
      lines.push(entry);
      entriesSet.add(entry);
      modified = true;
    }
  }

  // Write back to the file if modified
  if (modified) {
    writeFileSync(gitignorePath, lines.join(EOL));
    console.log(`Added ${entries.join(", ")} to ${gitignorePath}`);
  }

  return modified;
}

/**
 * Create a .gitignore file with the given entries if it doesn't exist
 * @param entries - The entries to add to the .gitignore file
 * @param gitignorePath - Path to the .gitignore file
 * @returns True if the file was created, false if it already existed
 */
export function createGitignoreIfNotExists(
  entries: string[],
  gitignorePath: string = ".gitignore"
): boolean {
  if (existsSync(gitignorePath)) {
    return addToGitignore(entries, gitignorePath);
  }

  // Create new .gitignore file
  writeFileSync(gitignorePath, entries.join(EOL));
  console.log(`Created ${gitignorePath} with entries: ${entries.join(", ")}`);

  return true;
}
