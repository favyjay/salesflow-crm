import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

// Create the underlying database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create the Prisma driver adapter bridge for PostgreSQL
const adapter = new PrismaPg(pool);

// Instantiate the dynamic client using the adapter
export const prisma = new PrismaClient({ adapter });