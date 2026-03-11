# SoundCloud Backend

Backend API for SoundCloud-like application built with Node.js, NestJS, TypeScript, and PostgreSQL.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: NestJS (Standardized, opinionated framework built on Express)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: AWS S3
- **Real-time**: Socket.io

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 7.x
- AWS Account (for S3)

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd soundcloud-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database
```bash
# Create database
createdb soundcloud_db

# Run migrations (TODO: after Phase 2)
# npm run migrate
```

5. Start development server
```bash
npm run dev
```


## Project Structure
This project follows a Domain-Driven structure. Instead of grouping by technical role (all controllers together), we group by feature (everything for Users together).
```
src/
├── auth/            # Authentication logic, JWT strategy, and Hashing
├── common/          # Shared middlewares, filters, and interceptors
├── config/          # Configuration modules (DB, Redis, S3)
├── providers/       # Third-party wrappers (AWS S3, Socket.io)
├── app.module.ts    # The root module that ties all features together
└── main.ts          # Application entry point & bootstrapping logic
```

## Code Style

This project follows Airbnb TypeScript style guide with Prettier formatting.
Code style is enforced through ESLint and Prettier, automatically applied on git commit via Husky.



## Available Scripts

Command     | Description

npm run dev | Starts NestJS in watch mode (auto-reloads on save).

npm run build | Compiles TypeScript to the dist/ folder.

npm run start | Runs the compiled production build.

npm run lint | Manually checks for code style violations.

npm run format | Manually formats all files in the src/ directory.

npm run type-check | Validates TypeScript integrity without building files.