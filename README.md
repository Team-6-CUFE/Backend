# SoundCloud Backend

Backend API for SoundCloud-like application built with Node.js, Express, TypeScript, and PostgreSQL.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
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
```
src/
├── config/          # Configuration files (DB, Redis, S3)
├── routes/          # API route definitions
├── controllers/     # Request handlers
├── services/        # Business logic
├── repositories/    # Database operations
├── models/          # TypeScript interfaces & DB models
├── middlewares/     # Express middlewares
├── utils/           # Helper functions
├── validators/      # Request validation schemas
├── types/           # TypeScript type definitions
├── sockets/         # Socket.io handlers
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Code Style

This project follows Airbnb TypeScript style guide with Prettier formatting.
Code style is enforced through ESLint and Prettier, automatically applied on git commit via Husky.

## Team

Backend Team - Phase 1
```
