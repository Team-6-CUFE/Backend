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

# 🚀 Dockerized Development Setup

This guide will help you set up the project locally using **Docker** and **Docker Compose v2**.

---

## 📦 Prerequisites

Before starting, make sure you have:

- Git
- A Linux-based system (or WSL for Windows)

---

## 🐳 1. Install Docker

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y docker.io

sudo systemctl enable docker
sudo systemctl start docker

### verify installation

If not:

sudo apt install docker-compose-plugin

5. Start Redis

**Option A — Docker**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine

# Verify Redis is running
docker exec -it redis redis-cli ping  # → PONG
```

**Option B — WSL (Windows)**
```bash
# Open WSL terminal
sudo apt update && sudo apt install redis-server
sudo service redis-server start

# Verify Redis is running
redis-cli ping  # → PONG
```

**Option C — macOS**
```bash
brew install redis
brew services start redis

# Verify Redis is running
redis-cli ping  # → PONG
```

6. Start development server
```bash
npm run dev
```
    5. Start development server
    ```bash
    npm run dev
    ```


Run them using:

npm run docker:dev

or

npm run docker:dev:build 
## this rebuilds if u run into any build problems 


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

| Command | Description |
|--------------------------|--------------------------------------------------|
| `npm run dev`            | Starts NestJS in watch mode (auto-reloads on save) |
| `npm run build`          | Compiles TypeScript to the dist/ folder           |
| `npm run start`          | Runs the compiled production build                |
| `npm run lint`           | Manually checks for code style violations         |
| `npm run format`         | Manually formats all files in the src/ directory  |
| `npm run type-check`     | Validates TypeScript integrity without building   |
| `nest g resource`        | Creates Nest resources                            |
| `npm run migration:run`  | Runs all pending migrations                       |
| `npm run migration:revert` | Reverts last migration                          |
| `npm run migration:show` | Shows migration status                            |
| `npm run migration:create src/database/migrations/MigrationName` | Creates empty migration |
| `npm run seed`           | Seed only (keep existing data)                    |
| `npm run seed:fresh`     | Fresh database (drop, migrate, seed)              |
| `npm run test`           | Run unit tests                                    |
