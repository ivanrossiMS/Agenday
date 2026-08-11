import { neon } from "@neondatabase/serverless";

export const getDb = () => {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
  if (!connectionString || !connectionString.startsWith("postgres")) {
    return null;
  }
  return neon(connectionString);
};
