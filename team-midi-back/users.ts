import { Context } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { hash, compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { getClient } from "./database.ts";
import "https://deno.land/std@0.181.0/dotenv/load.ts";

// Chargement et mise en cache de la clé JWT
let key: CryptoKey | null = null;
export async function getKey(): Promise<CryptoKey> {
  if (key) return key;
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET n'est pas défini dans les variables d'environnement");
  const encoder = new TextEncoder();
  key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return key;
}

// Inscription
export const registerUser = async (ctx: Context) => {
  const { nom, prenom, login, mot_de_passe, email, type } = await ctx.request.body({ type: "json" }).value;

  if (!["coach", "athlete"].includes(type)) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Type invalide" };
    return;
  }

  const hashedPassword = await hash(mot_de_passe);
  const client = await getClient();
  try {
    await client.queryObject(
      "INSERT INTO users (nom, prenom, login, mot_de_passe, email, type) VALUES ($1, $2, $3, $4, $5, $6)",
      [nom, prenom, login, hashedPassword, email, type],
    );
    ctx.response.status = 201;
    ctx.response.body = { message: "Inscription réussie" };
  } catch (e) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: String(e) };
  } finally {
    client.release();
  }
};

// Connexion
export const loginUser = async (ctx: Context) => {
  const { login, mot_de_passe } = await ctx.request.body({ type: "json" }).value;
  const client = await getClient();

  try {
    const result = await client.queryObject<{
      id: number;
      login: string;
      mot_de_passe: string;
      type: string;
      id_groupe: number | null;
    }>(
      "SELECT id, login, mot_de_passe, type, id_groupe FROM users WHERE login = $1",
      [login],
    );

    if (result.rows.length === 0) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects" };
      return;
    }

    const { id, login: log, mot_de_passe: hashed, type, id_groupe } = result.rows[0];

    if (!(await compare(mot_de_passe, hashed))) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects" };
      return;
    }

    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      { id, login: log, type, id_groupe, exp: getNumericDate(60 * 60) }, // 1h
      await getKey(),
    );

    // ---------- Options cookie pilotées par l'environnement ----------
    const secure = (Deno.env.get("COOKIE_SECURE") ?? "false") === "true";
    const httpOnly = (Deno.env.get("COOKIE_HTTPONLY") ?? "true") === "true";
    const sameSiteEnv = Deno.env.get("COOKIE_SAMESITE") ?? "Lax"; // local: Lax | prod: None
    const sameSite = (["Lax", "Strict", "None"] as const).includes(sameSiteEnv as any)
      ? (sameSiteEnv as "Lax" | "Strict" | "None")
      : "Lax";

    ctx.cookies.set("auth", jwt, {
      httpOnly,   // recommandé: true partout
      secure,     // prod HTTPS: true (ex. Render)
      sameSite,   // prod: "None" (nécessite secure:true)
      path: "/",
      // maxAge: 60 * 60 * 2, // optionnel: 2h si tu veux coller à JWT_EXPIRATION
    });
    // ----------------------------------------------------------------

    ctx.response.status = 200;
    ctx.response.body = { message: "Connexion réussie", type };
  } catch (e) {
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur", error: String(e) };
  } finally {
    client.release();
  }
};

// Middleware
export const authMiddleware = async (ctx: Context, next: () => Promise<unknown>) => {
  const token = await ctx.cookies.get("auth");
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Non autorisé (pas de token)" };
    return;
  }

  try {
    const payload = await verify(token, await getKey());
    ctx.state.user = payload;
    await next();
  } catch (_) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Token invalide" };
  }
};

// Récupération nom athlète
export const getAthleteNom = async (ctx: Context) => {
  const id = parseInt(ctx.params.id!);
  const client = await getClient();

  try {
    const result = await client.queryObject<{ prenom: string; nom: string }>(
      "SELECT prenom, nom FROM users WHERE id = $1 AND type = 'athlete'",
      [id],
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Athlète introuvable" };
      return;
    }

    const { prenom, nom } = result.rows[0];
    ctx.response.body = { prenom, nom };
  } catch (e) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Erreur serveur", detail: String(e) };
  } finally {
    client.release();
  }
};
