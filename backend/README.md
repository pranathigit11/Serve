# SERVE Backend

This is the Node.js + Express backend foundation for the SERVE project. It uses TypeScript for type safety and Prisma ORM for connecting to PostgreSQL.

## 1. Requirements
- Node.js (v18 or higher)
- PostgreSQL

## 2. Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   Update the `DATABASE_URL` in your `.env` to point to your PostgreSQL instance.

3. **Prisma Setup:**
   Run Prisma commands to generate the client and push the schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## 3. Starting the Server

Start the development server with hot-reloading:
```bash
npm run dev
```

Build the project for production:
```bash
npm run build
```

Check for TypeScript errors:
```bash
npm run typecheck
```

## 4. Endpoints

- **Health Check:** `GET /api/health`
- **Database Connection Check:** `GET /api/health/db`

## 5. Scope
Currently, this backend establishes the foundation:
- Express server configuration with JSON and CORS middleware
- Basic error handling and 404 responses
- Prisma integration for PostgreSQL
- Development scripts and strict TypeScript setup

Further models and business logic will be implemented in subsequent phases.
