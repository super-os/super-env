#!/usr/bin/env node

/**
 * CLI entry point for super-env
 */

import { createCLI } from "./cli/index";

// Create and run the CLI
const program = createCLI();
program.parse(process.argv);
