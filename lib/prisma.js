// db.js
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import "dotenv/config";

// 1. Create a Postgres connection pool
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// 2. Wrap it in the Prisma adapter
const adapter = new PrismaPg(pool);

// 3. Initialize the Client using that adapter
/** @type {import('../src/generated/prisma/client').PrismaClient} */
export const prisma = new PrismaClient({ adapter });
