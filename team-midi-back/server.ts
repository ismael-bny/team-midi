import "https://deno.land/std@0.181.0/dotenv/load.ts";
import { Application } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import router from "./routes.ts";

const app = new Application();

// Origine autorisée (ex: frontend en local ou en HTTPS)
const allowedOrigin = Deno.env.get("FRONTEND_ORIGIN") ?? "http://localhost:5500";

// Middleware manuel pour répondre aux requêtes CORS (ex: OPTIONS)
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  ctx.response.headers.set("Access-Control-Allow-Credentials", "true");

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  await next();
});

// Middleware oakCors complémentaire
app.use(oakCors({
  origin: allowedOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Routes définies dans routes.ts
app.use(router.routes());
app.use(router.allowedMethods());

// Démarrage du serveur sur le port défini
const port = parseInt(Deno.env.get("PORT") ?? "8000");
console.log(`HTTP server running on http://localhost:${port}`);

await app.listen({ port });
