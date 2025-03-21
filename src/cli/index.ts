/**
 * CLI functionality for managing .env files
 */

import { Command } from "commander";
import { spawn } from "child_process";
import inquirer from "inquirer";
import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

import {
  generateMasterKey,
  saveMasterKey,
  encryptEnvFile,
  decryptEnvFile,
  MASTER_KEY_FILENAME,
} from "../core/encryption";
import { createGitignoreIfNotExists } from "../core/gitignore";

// Import framework-specific instructions
import NextJS from "../frameworks/nextjs";

// Supported frameworks
const FRAMEWORKS = {
  nextjs: {
    name: "Next.js",
    setupInstructions: NextJS.setupInstructions,
  },
  // Add more frameworks here in the future
};

type Framework = keyof typeof FRAMEWORKS;

/**
 * Initialize a new super-env project
 * @param options Command options
 */
export async function initCommand(options: { framework?: Framework } = {}) {
  console.log(chalk.green("🚀 Initializing super-env in your project"));

  // Ask for framework if not provided
  let framework = options.framework || "nextjs"; // Default to nextjs if not specified
  if (!options.framework) {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "framework",
        message: "Which framework are you using?",
        choices: Object.entries(FRAMEWORKS).map(([key, value]) => ({
          name: value.name,
          value: key,
        })),
      },
    ]);
    framework = answer.framework as Framework;
  }

  // Generate and save master key
  const masterKey = generateMasterKey();
  saveMasterKey(masterKey);

  // Add MASTER_KEY.key to .gitignore
  createGitignoreIfNotExists([MASTER_KEY_FILENAME]);

  // Display framework-specific instructions
  console.log("\n");
  console.log(chalk.cyan("✅ Master key generated and added to .gitignore"));
  console.log("\n");
  console.log(chalk.bold("📝 Framework-specific setup instructions:"));
  console.log(FRAMEWORKS[framework].setupInstructions);

  // Create a sample .env file if it doesn't exist
  if (!existsSync(".env")) {
    writeFileSync(
      ".env",
      `# Environment variables for ${FRAMEWORKS[framework].name}\n\n# Add your environment variables here\n`
    );
    console.log(chalk.green("\n✅ Created a sample .env file"));
  }

  console.log(chalk.green("\n🎉 Initialization complete!"));
  console.log(chalk.yellow("\n💡 Next steps:"));
  console.log("1. Add your environment variables to .env");
  console.log(
    `2. Run ${chalk.bold("npx super-env encrypt")} to encrypt your .env file`
  );
  console.log(`3. Commit the encrypted .env.enc file to your repository`);
}

/**
 * Encrypt a .env file
 * @param options Command options
 */
export function encryptCommand(
  options: { input?: string; output?: string; key?: string } = {}
) {
  const inputPath = options.input || ".env";
  const outputPath = options.output || ".env.enc";
  const keyPath = options.key || MASTER_KEY_FILENAME;

  try {
    console.log(chalk.blue(`🔒 Encrypting ${inputPath} to ${outputPath}`));
    encryptEnvFile(inputPath, outputPath, keyPath);
    console.log(
      chalk.green(`\n✅ Successfully encrypted ${inputPath} to ${outputPath}`)
    );
    console.log(
      chalk.yellow(
        `\n💡 Tip: Commit ${outputPath} to your repository, but keep ${inputPath} in your .gitignore`
      )
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
    } else {
      console.error(chalk.red("❌ An unknown error occurred"));
    }
    process.exit(1);
  }
}

/**
 * Decrypt a .env file
 * @param options Command options
 */
export function decryptCommand(
  options: { input?: string; output?: string; key?: string } = {}
) {
  const inputPath = options.input || ".env.enc";
  const outputPath = options.output || ".env";
  const keyPath = options.key || MASTER_KEY_FILENAME;

  try {
    console.log(chalk.blue(`🔓 Decrypting ${inputPath} to ${outputPath}`));
    decryptEnvFile(inputPath, outputPath, keyPath);
    console.log(
      chalk.green(`\n✅ Successfully decrypted ${inputPath} to ${outputPath}`)
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
    } else {
      console.error(chalk.red("❌ An unknown error occurred"));
    }
    process.exit(1);
  }
}

/**
 * Edit an encrypted .env file
 * @param options Command options
 */
export function editCommand(
  options: { file?: string; key?: string; editor?: string } = {}
) {
  const encryptedPath = options.file || ".env.enc";
  const keyPath = options.key || MASTER_KEY_FILENAME;
  const tempPath = ".env.tmp";

  // Get the preferred editor
  const editor = options.editor || process.env.EDITOR || "vim";

  try {
    // Decrypt to a temporary file
    console.log(chalk.blue(`🔓 Decrypting ${encryptedPath} for editing`));
    decryptEnvFile(encryptedPath, tempPath, keyPath);

    // Open the editor
    console.log(chalk.blue(`📝 Opening ${tempPath} in ${editor}`));

    const child = spawn(editor, [tempPath], {
      stdio: "inherit",
      shell: true,
    });

    // Re-encrypt after the editor is closed
    child.on("exit", (code) => {
      if (code !== 0) {
        console.log(
          chalk.yellow(
            "⚠️ Editor exited with non-zero code, changes may not be saved"
          )
        );
      }

      // Re-encrypt the temporary file
      console.log(
        chalk.blue(`🔒 Re-encrypting edited file to ${encryptedPath}`)
      );
      encryptEnvFile(tempPath, encryptedPath, keyPath);

      // Remove the temporary file
      try {
        require("fs").unlinkSync(tempPath);
      } catch (err) {
        console.log(
          chalk.yellow(`⚠️ Could not remove temporary file ${tempPath}`)
        );
      }

      console.log(
        chalk.green(`\n✅ Successfully updated and encrypted ${encryptedPath}`)
      );
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
    } else {
      console.error(chalk.red("❌ An unknown error occurred"));
    }
    process.exit(1);
  }
}

/**
 * Create and configure the CLI command parser
 */
export function createCLI(): Command {
  const program = new Command();

  program
    .name("super-env")
    .description("Secure .env file management with type-safety")
    .version("0.1.0");

  program
    .command("init")
    .description("Initialize super-env in your project")
    .option(
      "-f, --framework <framework>",
      "Specify the framework you are using"
    )
    .action((options) => initCommand(options));

  program
    .command("encrypt")
    .description("Encrypt a .env file")
    .option("-i, --input <input>", "Input .env file path (default: .env)")
    .option(
      "-o, --output <output>",
      "Output encrypted file path (default: .env.enc)"
    )
    .option("-k, --key <key>", "Master key file path (default: MASTER_KEY.key)")
    .action((options) => encryptCommand(options));

  program
    .command("decrypt")
    .description("Decrypt a .env.enc file")
    .option(
      "-i, --input <input>",
      "Input encrypted file path (default: .env.enc)"
    )
    .option("-o, --output <output>", "Output .env file path (default: .env)")
    .option("-k, --key <key>", "Master key file path (default: MASTER_KEY.key)")
    .action((options) => decryptCommand(options));

  program
    .command("edit")
    .description("Edit an encrypted .env file")
    .option("-f, --file <file>", "Encrypted file path (default: .env.enc)")
    .option("-k, --key <key>", "Master key file path (default: MASTER_KEY.key)")
    .option("-e, --editor <editor>", "Editor to use (default: $EDITOR or vim)")
    .action((options) => editCommand(options));

  return program;
}

export default { createCLI };
