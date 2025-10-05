// database.ts

import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

// Nombre maximum de connexions simultanées à la base
const POOL_CONNECTIONS = 10;

// Chargement de l'URL de la base depuis les variables d'environnement
const databaseUrl = Deno.env.get("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL n'est pas défini dans les variables d'environnement");
}

// Création du pool de connexions PostgreSQL
const pool = new Pool(databaseUrl, POOL_CONNECTIONS, true);

/**
 * Récupère un client PostgreSQL à partir du pool.
 * N'oublie pas de faire `client.release()` quand tu as fini !
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};
