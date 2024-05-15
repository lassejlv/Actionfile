#!/usr/bin/env node

import toml from "toml";
import fs from "fs";
import { CommandSchema, type Command } from "./zod";
import child_process from "child_process";

const FILE_NAME = "Actionfile.toml";
const COMMAND_TO_EXECUTE = process.argv[2];

if (!fs.existsSync(FILE_NAME)) {
  console.error(`No ${FILE_NAME}. Exiting.`);
  process.exit(1);
}

try {
  const ActionText = await fs.promises.readFile(FILE_NAME, "utf-8");
  const Commands = toml.parse(ActionText) as Record<string, Command>;

  // If no command is provided, list available commands
  if (!COMMAND_TO_EXECUTE) {
    console.info(`Available commands in ${FILE_NAME}:`);
    for (const cmd in Commands) {
      console.info(`- ${cmd}`);
    }
    process.exit(0);
  }

  // Check if the command to execute is in the Actionfile
  if (!Object.keys(Commands).includes(COMMAND_TO_EXECUTE)) {
    console.error(`No ${COMMAND_TO_EXECUTE} in ${FILE_NAME}. Exiting.`);
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
          console.error(`No path provided for env. Exiting.`);
          process.exit(1);
        }

        // Check if the path exists
        if (!fs.existsSync(path)) {
          console.error(`No ${path}. Exiting.`);
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
        `Failed to parse ${cmd}: ${parsed.error.message}. Exiting.`
      );
      process.exit(1);
    }

    // If parsed successfully, execute the command
    const { cmd: command, silent } = parsed.data;

    if (COMMAND_TO_EXECUTE !== cmd) continue;

    if (!silent) {
      console.info(`Executing ${cmd}...`);
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
        `Failed to execute ${cmd}: ${result.error?.message}. Exiting.`
      );
      process.exit(1);
    }

    if (!silent) {
      console.info(`Successfully executed ${cmd}.`);
    }
    process.exit(0);
  }
} catch (error: any) {
  console.error(`Failed execute: ${error.message}. Exiting.`);
  process.exit(1);
}
