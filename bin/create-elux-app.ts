#!/usr/bin/env node

/**
 * Create Elux App CLI
 * Bootstrap new Elux applications with ease
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";

// Terminal colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Available plugins
const AVAILABLE_PLUGINS = [
  { name: "auth", description: "Authentication via Auth.js" },
  { name: "prisma", description: "Database ORM" },
  { name: "stripe", description: "Payment processing" },
  {
    name: "ai",
    description: "AI capabilities (OpenAI, Gemini, Anthropic, DeepSeek)",
  },
  { name: "lucide", description: "Icon library" },
];

// Project configuration
interface ProjectConfig {
  name: string;
  description: string;
  author: string;
  plugins: string[];
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

// Ask a question and get the answer
function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => {
      resolve(answer);
    });
  });
}

// Ask a yes/no question
async function confirm(question: string): Promise<boolean> {
  const answer = await ask(`${question} (y/n)`);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

// Display a header
function header(text: string): void {
  console.log("\n");
  console.log("=".repeat(text.length + 4));
  console.log(`  ${text}  `);
  console.log("=".repeat(text.length + 4));
  console.log("\n");
}

// Create project directory
function createProjectDir(projectPath: string): void {
  if (fs.existsSync(projectPath)) {
    if (fs.readdirSync(projectPath).length > 0) {
      throw new Error(
        `Directory ${projectPath} already exists and is not empty.`
      );
    }
  } else {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  // Create subdirectories
  const dirs = ["app", "app/api", "app/components", "styles", "public", "elux"];

  dirs.forEach((dir) => {
    const dirPath = path.join(projectPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Copy the Elux framework to the project
function copyEluxFramework(projectPath: string): void {
  console.log("Copying Elux framework...");

  const sourceDir = path.join(__dirname, "..", "elux");
  const targetDir = path.join(projectPath, "elux");

  copyDirectory(sourceDir, targetDir);
}

// Copy a directory recursively
function copyDirectory(source: string, target: string): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

// Create package.json
function createPackageJson(projectPath: string, config: ProjectConfig): void {
  console.log("Creating package.json...");

  const dependencies: Record<string, string> = {
    dotenv: "^16.0.3",
    express: "^4.18.2",
  };

  const devDependencies: Record<string, string> = {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    typescript: "^5.3.3",
    vite: "^4.5.1",
    tsx: "^4.6.0",
    vitest: "^0.34.6",
  };

  // Add plugin-specific dependencies
  if (config.plugins.includes("auth")) {
    dependencies["next-auth"] = "^4.24.5";
  }

  if (config.plugins.includes("prisma")) {
    dependencies["prisma"] = "^5.6.0";
    dependencies["@prisma/client"] = "^5.6.0";
    devDependencies["prisma"] = "^5.6.0";
  }

  if (config.plugins.includes("stripe")) {
    dependencies["stripe"] = "^14.5.0";
  }

  if (config.plugins.includes("ai")) {
    dependencies["openai"] = "^4.20.1";
    dependencies["@google/generative-ai"] = "^0.1.3";
  }

  if (config.plugins.includes("lucide")) {
    dependencies["lucide"] = "^0.294.0";
  }

  const packageJson = {
    name: config.name,
    version: "0.1.0",
    description: config.description,
    author: config.author,
    license: "MIT",
    type: "module",
    scripts: {
      dev: "set NODE_ENV=development && tsx --experimental-specifier-resolution=node server.ts",
      build: "vite build",
      start: "set NODE_ENV=production && node dist/server.js",
      lint: "eslint .",
      test: "vitest run",
    },
    dependencies,
    devDependencies,
  };

  fs.writeFileSync(
    path.join(projectPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
}

// Create tsconfig.json
function createTsConfig(projectPath: string): void {
  console.log("Creating tsconfig.json...");

  const tsConfig = {
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "node",
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      jsx: "react",
      jsxFactory: "h",
      jsxFragmentFactory: "Fragment",
      outDir: "dist",
      baseUrl: ".",
      paths: {
        "@/*": ["./*"],
        "@app/*": ["./app/*"],
        "@elux/*": ["./elux/*"],
      },
    },
    include: ["**/*.ts", "**/*.tsx"],
    exclude: ["node_modules", "dist"],
  };

  fs.writeFileSync(
    path.join(projectPath, "tsconfig.json"),
    JSON.stringify(tsConfig, null, 2)
  );
}

// Create a basic app config
function createAppConfig(projectPath: string, config: ProjectConfig): void {
  console.log("Creating app configuration...");

  const eluxConfig = `/**
 * Elux Config
 * Application configuration and plugin settings
 */

import { pluginManager } from './elux/plugins';
import { ThemePlugin, AuthPlugin, PrismaPlugin, StripePlugin, AIPlugin } from './elux/plugins';

export async function setupPlugins() {
  // Register theme plugin by default
  pluginManager.register(ThemePlugin, {
    defaultTheme: 'system',
  });
  
${
  config.plugins.includes("auth")
    ? `  // Register auth plugin
  pluginManager.register(AuthPlugin, {
    providers: [
      // Configure your auth providers here
    ],
    secret: process.env.AUTH_SECRET || 'your-secret-key',
  });
`
    : ""
}
${
  config.plugins.includes("prisma")
    ? `  // Register prisma plugin
  pluginManager.register(PrismaPlugin, {
    // Configure Prisma options here
  });
`
    : ""
}
${
  config.plugins.includes("stripe")
    ? `  // Register stripe plugin
  pluginManager.register(StripePlugin, {
    apiKey: process.env.STRIPE_API_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
`
    : ""
}
${
  config.plugins.includes("ai")
    ? `  // Register AI plugin
  pluginManager.register(AIPlugin, {
    provider: 'openai', // Choose provider: 'openai', 'gemini', 'anthropic', or 'deepseek'
    apiKey: process.env.OPENAI_API_KEY || '',
  });
`
    : ""
}

  // Initialize plugins
  await pluginManager.initialize();
}

export default {
  appName: '${config.name}',
  description: '${config.description}',
  version: '0.1.0',
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
};
`;

  fs.writeFileSync(path.join(projectPath, "elux.config.ts"), eluxConfig);
}

// Create a sample homepage
function createHomePage(projectPath: string, config: ProjectConfig): void {
  console.log("Creating sample home page...");

  // Create app/page.tsx
  const pageContent = `/** @jsx h */
import { h } from '../elux/core/vdom';
import Link from '../elux/Link';

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto mt-10">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to ${config.name}
        </h1>
        
        <p className="text-lg mb-6 text-center">
          A project built with Elux Framework
        </p>
        
        <div className="flex justify-center space-x-4 mb-12">
          <Link href="/about" className="bg-primary text-white px-4 py-2 rounded">
            About
          </Link>
          <a 
            href="https://github.com/yourusername/${config.name}" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-dark text-white px-4 py-2 rounded"
          >
            GitHub
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray100 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Features</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Custom VDOM implementation</li>
              <li>SSR & SSG Support</li>
              <li>File-based routing</li>
              <li>Built-in styling system</li>
${config.plugins
  .map(
    (plugin) =>
      `              <li>${
        AVAILABLE_PLUGINS.find((p) => p.name === plugin)?.description || plugin
      } support</li>`
  )
  .join("\n")}
            </ul>
          </div>
          
          <div className="bg-gray100 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
            <p className="mb-4">
              Edit <code className="bg-gray200 px-2 py-1 rounded">app/page.tsx</code> to make changes to this page.
            </p>
            <p>
              Check out the documentation to learn more about Elux Framework.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Get static props (SSG)
export async function getStaticProps() {
  return {
    props: {
      title: '${config.name} - Home',
    },
  };
}
`;

  fs.writeFileSync(path.join(projectPath, "app", "page.tsx"), pageContent);

  // Create app/_layout.tsx
  const layoutContent = `/** @jsx h */
import { h } from '../elux/core/vdom';
import { ThemeToggle } from '../elux/plugins/theme';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-light dark:bg-gray800 text-gray900 dark:text-white">
      <header className="py-4 px-6 bg-white dark:bg-gray900 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">${config.name}</h1>
          <nav className="flex space-x-4 items-center">
            <a href="/" className="hover:text-primary">Home</a>
            <a href="/about" className="hover:text-primary">About</a>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      
      <main>
        {children}
      </main>
      
      <footer className="py-6 px-6 bg-white dark:bg-gray900 border-t">
        <div className="container mx-auto text-center">
          <p>© {new Date().getFullYear()} ${config.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
`;

  fs.writeFileSync(path.join(projectPath, "app", "_layout.tsx"), layoutContent);

  // Create app/about/page.tsx
  const aboutContent = `/** @jsx h */
import { h } from '../../elux/core/vdom';
import Link from '../../elux/Link';

export default function AboutPage() {
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">About ${config.name}</h1>
      
      <p className="mb-4">
        This is a project built with Elux Framework, a custom TypeScript-first 
        web framework with its own VDOM implementation.
      </p>
      
      <p className="mb-8">
        ${config.description}
      </p>
      
      <Link href="/" className="bg-primary text-white px-4 py-2 rounded">
        Back to Home
      </Link>
    </div>
  );
}

// Get server side props (SSR)
export async function getServerSideProps() {
  return {
    props: {
      title: '${config.name} - About',
    },
  };
}
`;

  // Create about directory and page
  const aboutDir = path.join(projectPath, "app", "about");
  if (!fs.existsSync(aboutDir)) {
    fs.mkdirSync(aboutDir, { recursive: true });
  }

  fs.writeFileSync(path.join(aboutDir, "page.tsx"), aboutContent);
}

// Create README.md
function createReadme(projectPath: string, config: ProjectConfig): void {
  console.log("Creating README.md...");

  const readmeContent = `# ${config.name}

${config.description}

## Features

- Built with Elux Framework
- TypeScript-first development
- Server-side rendering (SSR) & Static site generation (SSG)
- Custom VDOM implementation (no React dependency)
- File-based routing
${config.plugins
  .map(
    (plugin) =>
      `- ${
        AVAILABLE_PLUGINS.find((p) => p.name === plugin)?.description || plugin
      } integration`
  )
  .join("\n")}

## Getting Started

First, run the development server:

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- \`app/\` - Application pages and components
- \`elux/\` - Elux framework core files
- \`public/\` - Static assets
- \`styles/\` - CSS stylesheets

## Learn More

To learn more about Elux Framework, check out the documentation.

## License

MIT
`;

  fs.writeFileSync(path.join(projectPath, "README.md"), readmeContent);
}

// Create .env file
function createEnvFile(projectPath: string, config: ProjectConfig): void {
  console.log("Creating .env files...");

  const envContent = `# Environment Variables
PORT=3000

${
  config.plugins.includes("auth")
    ? `# Auth.js
AUTH_SECRET=your-auth-secret-key
# Add your Auth providers credentials here
`
    : ""
}
${
  config.plugins.includes("prisma")
    ? `# Prisma
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
`
    : ""
}
${
  config.plugins.includes("stripe")
    ? `# Stripe
STRIPE_API_KEY=your-stripe-api-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
`
    : ""
}
${
  config.plugins.includes("ai")
    ? `# AI
OPENAI_API_KEY=your-openai-api-key
# GOOGLE_API_KEY=your-google-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key
# DEEPSEEK_API_KEY=your-deepseek-api-key
`
    : ""
}
`;

  fs.writeFileSync(path.join(projectPath, ".env.local"), envContent);
  fs.writeFileSync(path.join(projectPath, ".env.example"), envContent);
}

// Create .gitignore
function createGitIgnore(projectPath: string): void {
  console.log("Creating .gitignore...");

  const gitignoreContent = `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build
/dist

# misc
.DS_Store
*.pem
.env.local
.env.development.local
.env.test.local
.env.production.local

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo

# Prisma
/prisma/*.db
/prisma/migrations

# Cache
.cache/
`;

  fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignoreContent);
}

// Initialize Git repository
function initGitRepo(projectPath: string): void {
  try {
    console.log("Initializing Git repository...");
    execSync("git init", { cwd: projectPath, stdio: "ignore" });
    execSync("git add .", { cwd: projectPath, stdio: "ignore" });
    execSync('git commit -m "Initial commit: Elux project setup"', {
      cwd: projectPath,
      stdio: "ignore",
    });
    console.log("Git repository initialized!");
  } catch (error) {
    console.warn(
      "Warning: Git initialization failed. Please initialize manually."
    );
  }
}

// Initialize plugin-specific configurations
function initializePlugins(projectPath: string, config: ProjectConfig): void {
  if (config.plugins.includes("prisma")) {
    console.log("Setting up Prisma...");

    // Create prisma directory
    const prismaDir = path.join(projectPath, "prisma");
    if (!fs.existsSync(prismaDir)) {
      fs.mkdirSync(prismaDir, { recursive: true });
    }

    // Create schema.prisma
    const schemaContent = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Example models
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

    fs.writeFileSync(path.join(prismaDir, "schema.prisma"), schemaContent);
  }
}

// Main function to create a new Elux app
async function createEluxApp(): Promise<void> {
  try {
    // Show the banner
    showBanner();
    console.log("Welcome to the Elux Framework project generator!");
    console.log("Let's set up your new project.\n");

    // Get project name
    let projectName = process.argv[2];
    if (!projectName) {
      projectName = await ask("Project name:");
      if (!projectName) {
        throw new Error("Project name is required.");
      }
    }

    // Sanitize project name for npm
    projectName = projectName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Get project description
    const description = await ask("Project description:");

    // Get author name
    const author = await ask("Author:");

    // Select plugins
    console.log("\nAvailable plugins:");
    AVAILABLE_PLUGINS.forEach((plugin, index) => {
      console.log(`${index + 1}. ${plugin.name} - ${plugin.description}`);
    });

    const selectedPlugins: string[] = [];

    // Ask for each plugin
    for (const plugin of AVAILABLE_PLUGINS) {
      const usePlugin = await confirm(
        `Use ${plugin.name} (${plugin.description})?`
      );
      if (usePlugin) {
        selectedPlugins.push(plugin.name);
      }
    }

    // Create project configuration
    const config: ProjectConfig = {
      name: projectName,
      description,
      author,
      plugins: selectedPlugins,
    };

    // Show summary
    header("Project Summary");
    console.log(`Name: ${config.name}`);
    console.log(`Description: ${config.description}`);
    console.log(`Author: ${config.author}`);
    console.log(`Plugins: ${config.plugins.join(", ") || "None"}`);

    // Confirm creation
    const confirmCreate = await confirm(
      "\nCreate project with these settings?"
    );
    if (!confirmCreate) {
      console.log("Project creation cancelled.");
      process.exit(0);
    }

    // Project path
    const projectPath = path.resolve(process.cwd(), projectName);

    // Create project directory and structure
    header("Creating Project");
    createProjectDir(projectPath);
    copyEluxFramework(projectPath);
    createPackageJson(projectPath, config);
    createTsConfig(projectPath);
    createAppConfig(projectPath, config);
    createHomePage(projectPath, config);
    createReadme(projectPath, config);
    createEnvFile(projectPath, config);
    createGitIgnore(projectPath);
    initializePlugins(projectPath, config);
    initGitRepo(projectPath);

    // Success message
    header("Success!");
    console.log(
      `Your Elux project "${config.name}" has been created successfully!\n`
    );
    console.log(`To get started:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev\n`);
    console.log(`Then open http://localhost:3000 in your browser.\n`);
    console.log(`Happy coding!`);
  } catch (error) {
    console.error("\nError:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the CLI
createEluxApp();
