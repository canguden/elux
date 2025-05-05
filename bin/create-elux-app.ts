#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import readline from "readline";

// CLI color utilities
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },

  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
  },
};

// Available plugins
const availablePlugins = [
  { name: "auth", description: "Authentication support via Auth.js" },
  { name: "prisma", description: "Database ORM with Prisma" },
  { name: "stripe", description: "Payment integration with Stripe" },
  { name: "openai", description: "AI integration with OpenAI" },
  { name: "gemini", description: "AI integration with Google Gemini" },
  { name: "anthropic", description: "AI integration with Anthropic Claude" },
];

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Prompt utility that returns a promise
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Display the banner
function showBanner() {
  console.log(`
${colors.fg.blue}${colors.bright}███████╗██╗     ██╗   ██╗██╗  ██╗${colors.reset}
${colors.fg.blue}${colors.bright}██╔════╝██║     ██║   ██║╚██╗██╔╝${colors.reset}
${colors.fg.blue}${colors.bright}█████╗  ██║     ██║   ██║ ╚███╔╝ ${colors.reset}
${colors.fg.blue}${colors.bright}██╔══╝  ██║     ██║   ██║ ██╔██╗ ${colors.reset}
${colors.fg.blue}${colors.bright}███████╗███████╗╚██████╔╝██╔╝ ██╗${colors.reset}
${colors.fg.blue}${colors.bright}╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝${colors.reset}
                              
${colors.fg.cyan}A fully hackable, TypeScript-first framework${colors.reset}
`);
}

// Check if a command is available
function commandExists(command: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

// Copy directory recursively
function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main function
async function run() {
  showBanner();

  // Get project name
  const projectName = await prompt(
    `${colors.fg.green}? ${colors.reset}${colors.bright}Project name: ${colors.reset}`
  );
  if (!projectName) {
    console.log(
      `${colors.fg.red}Error: Project name cannot be empty${colors.reset}`
    );
    process.exit(1);
  }

  const projectDir = path.join(process.cwd(), projectName);

  // Check if directory exists
  if (fs.existsSync(projectDir)) {
    const overwrite = await prompt(
      `${colors.fg.yellow}? ${colors.reset}${colors.bright}Directory already exists. Overwrite? (y/n): ${colors.reset}`
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log(`${colors.fg.yellow}Operation cancelled${colors.reset}`);
      process.exit(0);
    }
  }

  // Select plugins
  console.log(`\n${colors.bright}Select plugins to include:${colors.reset}`);

  const selectedPlugins = [];
  for (const plugin of availablePlugins) {
    const answer = await prompt(
      `${colors.fg.green}? ${colors.reset}${colors.bright}Include ${plugin.name} (${plugin.description})? (y/n): ${colors.reset}`
    );
    if (answer.toLowerCase() === "y") {
      selectedPlugins.push(plugin.name);
    }
  }

  // Select package manager
  console.log(`\n${colors.bright}Select package manager:${colors.reset}`);
  const packageManagers = ["npm", "yarn", "pnpm"];
  let packageManager = "";

  for (const pm of packageManagers) {
    if (commandExists(pm)) {
      const answer = await prompt(
        `${colors.fg.green}? ${colors.reset}${colors.bright}Use ${pm}? (y/n): ${colors.reset}`
      );
      if (answer.toLowerCase() === "y") {
        packageManager = pm;
        break;
      }
    }
  }

  if (!packageManager) {
    packageManager = "npm";
    console.log(
      `${colors.fg.yellow}No package manager selected, defaulting to npm${colors.reset}`
    );
  }

  // Create project directory
  console.log(
    `\n${colors.fg.cyan}${colors.bright}Creating project...${colors.reset}`
  );

  try {
    // Create project directory
    fs.mkdirSync(projectDir, { recursive: true });

    // Copy template files
    const templateDir = path.join(__dirname, "../templates/base");
    copyDirSync(templateDir, projectDir);

    // Add selected plugins
    for (const plugin of selectedPlugins) {
      const pluginTemplateDir = path.join(
        __dirname,
        `../templates/plugins/${plugin}`
      );
      if (fs.existsSync(pluginTemplateDir)) {
        console.log(
          `${colors.fg.green}Adding ${plugin} plugin...${colors.reset}`
        );
        copyDirSync(pluginTemplateDir, projectDir);
      }
    }

    // Update package.json
    const packageJsonPath = path.join(projectDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      // Update project name
      packageJson.name = projectName;

      // Add selected plugins to dependencies
      for (const plugin of selectedPlugins) {
        switch (plugin) {
          case "auth":
            packageJson.dependencies["next-auth"] = "^4.22.1";
            break;
          case "prisma":
            packageJson.dependencies["prisma"] = "^4.16.1";
            packageJson.dependencies["@prisma/client"] = "^4.16.1";
            break;
          case "stripe":
            packageJson.dependencies["stripe"] = "^12.9.0";
            break;
          case "openai":
            packageJson.dependencies["openai"] = "^4.0.0";
            break;
          case "gemini":
            packageJson.dependencies["@google/generative-ai"] = "^0.1.0";
            break;
          case "anthropic":
            packageJson.dependencies["@anthropic-ai/sdk"] = "^0.5.0";
            break;
        }
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    // Install dependencies
    console.log(
      `\n${colors.fg.cyan}${colors.bright}Installing dependencies...${colors.reset}`
    );

    switch (packageManager) {
      case "npm":
        execSync("npm install", { stdio: "inherit", cwd: projectDir });
        break;
      case "yarn":
        execSync("yarn", { stdio: "inherit", cwd: projectDir });
        break;
      case "pnpm":
        execSync("pnpm install", { stdio: "inherit", cwd: projectDir });
        break;
    }

    console.log(
      `\n${colors.fg.green}${colors.bright}Project created successfully!${colors.reset}`
    );
    console.log(`\nTo get started, run:`);
    console.log(`  ${colors.fg.cyan}cd ${projectName}${colors.reset}`);
    console.log(
      `  ${colors.fg.cyan}${packageManager} ${
        packageManager === "yarn" ? "" : "run "
      }dev${colors.reset}`
    );
  } catch (error) {
    console.error(
      `${colors.fg.red}${colors.bright}Error creating project:${colors.reset}`,
      error
    );
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the CLI
run().catch((error) => {
  console.error(
    `${colors.fg.red}${colors.bright}Unexpected error:${colors.reset}`,
    error
  );
  process.exit(1);
});
