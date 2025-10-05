import { Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import {
  registerUser,
  loginUser,
  authMiddleware,
  getAthleteNom,
} from "./users.ts";

import seanceRouter from "./seances.ts";
import competitionRouter from "./competitions.ts";
import feedbackRouter from "./feedbacks.ts";
import groupesRouter from "./groupes.ts";

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.body = "Backend du projetweb - ismael-benayed";
});

// Liste des connexions WebSocket actives (athlètes)
const sockets: WebSocket[] = [];

// WebSocket ouverte à la connexion, permet d'envoyer des notifications en temps réel
router.get("/ws", async (ctx) => {
  const socket = await ctx.upgrade();
  sockets.push(socket);

  socket.addEventListener("close", () => {
    const index = sockets.indexOf(socket);
    if (index !== -1) sockets.splice(index, 1);
  });

  socket.addEventListener("error", (e) => {
    console.warn("WebSocket error ignorée :", e.message);
  });
});

// Envoie un message à tous les clients WebSocket connectés
export function broadcastNouvelleSeance(message: string) {
  for (const socket of sockets) {
    try {
      socket.send(message);
    } catch {
      // socket fermé ou erreur silencieuse
    }
  }
}

// Routes d'authentification et de session utilisateur
router
  .post("/register", registerUser)
  .post("/login", loginUser)

  // Vérifie si un utilisateur est connecté (JWT valide)
  .get("/verify", authMiddleware, (ctx) => {
    ctx.response.body = {
      message: "Utilisateur connecté",
      user: ctx.state.user,
    };
  })

  // Supprime le cookie d'authentification
  .get("/logout", (ctx) => {
    ctx.cookies.delete("auth");
    ctx.response.status = 200;
    ctx.response.body = { message: "Déconnexion réussie" };
  })

  // Donne le nom/prénom d’un athlète (utile pour affichage du planning)
  .get("/athlete/:id", authMiddleware, getAthleteNom);

// Intégration des sous-routers (séances, compétitions, feedbacks, groupes)
router
  .use(seanceRouter.routes(), seanceRouter.allowedMethods())
  .use(competitionRouter.routes(), competitionRouter.allowedMethods())
  .use(feedbackRouter.routes(), feedbackRouter.allowedMethods())
  .use(groupesRouter.routes(), groupesRouter.allowedMethods());

export default router;
