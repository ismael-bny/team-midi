import { Context } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { getKey } from "./users.ts";

import "https://deno.land/std@0.181.0/dotenv/load.ts";

/**
 * Middleware pour restreindre l'accès à un rôle ("coach" ou "athlete")
 */
export const requireRole = (expected: "coach" | "athlete") =>
  async (ctx: Context, next: () => Promise<unknown>) => {
    const token = await ctx.cookies.get("auth");

    if (!token) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Non autorisé (pas de token)" };
      return;
    }

    try {
      const payload = await verify(token, await getKey());

      if (typeof payload !== "object" || payload.type !== expected) {
        ctx.response.status = 403;
        ctx.response.body = { message: `Accès interdit au rôle ${payload?.type ?? "inconnu"}` };
        return;
      }

      ctx.state.user = payload;
      await next();
    } catch (_) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Token invalide ou expiré" };
    }
  };
