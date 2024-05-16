#!/usr/bin/env node

import toml from "toml";
import fs from "fs";
import { CommandSchema, type Command } from "./zod";
import child_process from "child_process";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

const FILE_NAME = "actionfile.toml";
let COMMAND_TO_EXECUTE = process.argv[2];

if (!fs.existsSync(FILE_NAME)) {
  // Create the Actionfile
  fs.writeFileSync(FILE_NAME, "");
}

// [build]
//  cmd = "bun build --minify --target=node src/index.ts --outdir=dist"
//  silent = true

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

  if (COMMAND_TO_EXECUTE === "--init") {
    if (Object.keys(Commands).length > 0) {
      console.error(chalk.red.bold(`Actionfile already exists. Exiting.`));
      process.exit(1);
    }

    let finalExampleConfig: string = "";

    const { useEnv } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useEnv",
        message: "Do you wanna use environment variables?",
        default: true,
      },
    ]);

    if (useEnv) {
      finalExampleConfig += `[env]\npath = ".env"\n\n`;
    }

    finalExampleConfig += `[example]\ncmd = "echo Hello World"\n`;

    // Create and write to the Actionfile
    await fs.promises
      .writeFile(FILE_NAME, finalExampleConfig)
      .catch((error) => {
        console.error(
          chalk.red.bold(`Failed to create ${FILE_NAME}: ${error.message}.`)
        );
        process.exit(1);
      });

    console.info(
      `${chalk.bold("Actionfile created successfully.")} ${
        chalk.red("Exiting.") + "\n" + finalExampleConfig
      }`
    );

    process.exit(0);
  }

  // If no command is provided, list available commands
  if (!COMMAND_TO_EXECUTE) {
    // Take the first command in the Actionfile but dont run env
    for (const cmd in Commands) {
      if (cmd === "env") continue;

      COMMAND_TO_EXECUTE = cmd;
      break;
    }
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
