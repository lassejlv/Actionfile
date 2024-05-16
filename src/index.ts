#!/usr/bin/env node

import toml from "toml";
import fs from "fs";
import { CommandSchema, type Command } from "./zod";
import child_process from "child_process";
import chalk from "chalk";
import ora from "ora";

const FILE_NAME = "Actionfile.toml";
const COMMAND_TO_EXECUTE = process.argv[2];

if (!fs.existsSync(FILE_NAME)) {
  console.error(chalk.bold(`No ${FILE_NAME}. Exiting.`));
  process.exit(1);
}

try {
  const ActionText = await fs.promises.readFile(FILE_NAME, "utf-8");
  const Commands = toml.parse(ActionText) as Record<string, Command>;

  // Check if command to execute is --version
  if (COMMAND_TO_EXECUTE === "--version") {
    const packageJson = await fs.promises.readFile("package.json", "utf-8");
    const { version } = JSON.parse(packageJson);
    console.info(
      `${chalk.blue("Version:")} ${chalk.bold(`v${version}`)}. ${chalk.red(
        "Exiting."
      )}`
    );
    process.exit(0);
  }

  // If no command is provided, list available commands
  if (!COMMAND_TO_EXECUTE) {
    console.info(`Available commands in ${chalk.bold(`${FILE_NAME}`)}:\n`);

    // Filter out the env command
    const commands = Object.keys(Commands).filter((cmd) => cmd !== "env");
    console.log(chalk.green(commands.join("\n")));

    process.exit(0);
  }

  // Check if the command to execute is in the Actionfile
  if (!Object.keys(Commands).includes(COMMAND_TO_EXECUTE)) {
    console.error(
      chalk.red.bold(`No ${COMMAND_TO_EXECUTE} in ${FILE_NAME}. Exiting.`)
    );
    process.exit(1);
  }

  for (const cmd in Commands) {
    const parsed = CommandSchema.safeParse(Commands[cmd]);

    let env: any = {};

    // If not parsed successfully, log the error
    if (!parsed.success) {
      if (cmd === "env") {
        // If the command is env, set the environment variables
        const path = Commands[cmd].path;

        // Check the path is provided
        if (!path || typeof path !== "string") {
          console.error(chalk.red.bold(`No path provided for env. Exiting.`));
          process.exit(1);
        }

        // Check if the path exists
        if (!fs.existsSync(path)) {
          console.error(chalk.red.bold(`No ${path}. Exiting.`));
          process.exit(1);
        }

        // Read the env file
        const envText = await fs.promises.readFile(path, "utf-8");

        // Parse the env file
        const envs = envText.split("\n");

        // Set the environment variables
        for (const envLine of envs) {
          const [key, value] = envLine.split("=");
          env[key] = value;
        }

        // Set the environment variables
        process.env = { ...process.env, ...env };

        continue;
      }

      console.error(
        chalk.red.bold(
          `Failed to parse ${cmd}: ${parsed.error.message}. Exiting.`
        )
      );
      process.exit(1);
    }

    // If parsed successfully, execute the command
    const { cmd: command, silent } = parsed.data;

    if (COMMAND_TO_EXECUTE !== cmd) continue;

    const executionSpinner = ora(`Executing ${cmd}...`);

    if (!silent) {
      executionSpinner.start();
    }

    // example env we have NAME=John and the cmd includes $NAME we will replace it with John
    // prettier-ignore
    const commandToRun = command.replace(/\$([a-zA-Z_]+[a-zA-Z0-9_]*)/g, (_, g1) => {
      return env[g1] || process.env[g1] || '';
    });

    const result = child_process.spawnSync(commandToRun, {
      shell: true,
      stdio: "inherit",
    });

    // If the command failed, log the error
    if (result.status !== 0) {
      console.error(
        chalk.red.bold(
          `Failed to execute ${cmd}: ${result.error?.message}. Exiting.`
        )
      );
      process.exit(1);
    }

    if (!silent) {
      executionSpinner.succeed(`Executed ${cmd}.`);
    }
    process.exit(0);
  }
} catch (error: any) {
  console.error(chalk.red.bold(`Failed execute: ${error.message}. Exiting.`));
  process.exit(1);
}
