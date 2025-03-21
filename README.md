# Super-Env

Secure .env file management with type-safety for TypeScript projects.

## Features

- **Type-Safe Environment Variables**: Define and validate environment variables with Zod schemas
- **Encryption for .env Files**: Securely encrypt your .env files so they can be committed to version control
- **Framework Support**: Designed to work with Next.js (with more frameworks coming soon)
- **CLI Tools**: Easy-to-use CLI for initialization, encryption, and editing of .env files

## Installation

```bash
# npm
npm install @super-os/super-env

# yarn
yarn add @super-os/super-env

# pnpm
pnpm add @super-os/super-env

# bun
bun add @super-os/super-env
```

## Quick Start

### 1. Initialize Super-Env in your project

```bash
npx super-env init
```

This will:

- Generate a `MASTER_KEY.key` file for encryption
- Add `MASTER_KEY.key` to your `.gitignore` file
- Create a sample `.env` file if you don't have one
- Display framework-specific setup instructions

### 2. Configure your environment variables

Create a type-safe environment schema in your project:

```typescript
// env.ts
import { z } from "zod";
import { createNextEnv } from "@super-os/super-env/nextjs";

export const env = createNextEnv(
  z.object({
    DATABASE_URL: z.string().url(),
    API_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "test", "production"]),

    // Client-side variables (automatically available to the browser)
    NEXT_PUBLIC_APP_URL: z.string().url(),
  })
);
```

### 3. Use your environment variables

```typescript
import { env } from "./env";

// In server-side code
console.log(env.server.DATABASE_URL);

// In client-side components
console.log(env.client.NEXT_PUBLIC_APP_URL);
```

### 4. Encrypt your .env file

```bash
npx super-env encrypt
```

This encrypts your `.env` file to `.env.enc` which you can safely commit to version control.

### 5. Edit your encrypted .env file

```bash
npx super-env edit
```

This will decrypt your `.env.enc` file, open it in your default editor, and re-encrypt it after you save.

## CLI Commands

### `super-env init`

Initialize Super-Env in your project.

```bash
npx super-env init [options]
```

Options:

- `-f, --framework <framework>`: Specify the framework you are using (default: prompt)

### `super-env encrypt`

Encrypt a .env file.

```bash
npx super-env encrypt [options]
```

Options:

- `-i, --input <input>`: Input .env file path (default: `.env`)
- `-o, --output <output>`: Output encrypted file path (default: `.env.enc`)
- `-k, --key <key>`: Master key file path (default: `MASTER_KEY.key`)

### `super-env decrypt`

Decrypt a .env.enc file.

```bash
npx super-env decrypt [options]
```

Options:

- `-i, --input <input>`: Input encrypted file path (default: `.env.enc`)
- `-o, --output <output>`: Output .env file path (default: `.env`)
- `-k, --key <key>`: Master key file path (default: `MASTER_KEY.key`)

### `super-env edit`

Edit an encrypted .env file.

```bash
npx super-env edit [options]
```

Options:

- `-f, --file <file>`: Encrypted file path (default: `.env.enc`)
- `-k, --key <key>`: Master key file path (default: `MASTER_KEY.key`)
- `-e, --editor <editor>`: Editor to use (default: `$EDITOR` or `vim`)

## Advanced Usage

### Using with Next.js

After running `super-env init`, follow these steps to integrate with Next.js:

1. Expose client-side variables in `next.config.js`:

```javascript
// next.config.js
const { env } = require("./env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: env.envObject(),
};

module.exports = nextConfig;
```

### Custom Environment Schema

You can use Zod's powerful schema validation for your environment variables:

```typescript
import { z } from "zod";
import { createNextEnv } from "@super-os/super-env/nextjs";

export const env = createNextEnv(
  z.object({
    // Required string URLs
    DATABASE_URL: z.string().url(),

    // Enums for specific values
    NODE_ENV: z.enum(["development", "test", "production"]),

    // Optional values with defaults
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .default("3000"),

    // Complex transformations
    FEATURE_FLAGS: z.string().transform((val) => {
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    }),

    // Client-side variables
    NEXT_PUBLIC_API_URL: z.string().url(),
  })
);
```

## Security Considerations

- Keep your `MASTER_KEY.key` file secure and never commit it to version control
- For production, consider using a secure secrets manager like AWS Secrets Manager or HashiCorp Vault
- Rotate your master key periodically for enhanced security

## License

MIT
