import { Router, Context } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { getClient } from "./database.ts";
import { requireRole } from "./middlewares.ts";

const router = new Router();

// Récupère tous les feedbacks ou ceux d'une séance spécifique
router.get("/feedbacks", async (ctx: Context) => {
  const id_seance = ctx.request.url.searchParams.get("id_seance");
  const client = await getClient();

  try {
    if (id_seance) {
      const result = await client.queryObject<{
        date: string;
        commentaire: string;
        cote_effort: number;
        lien_activite: string;
        nom: string;
        prenom: string;
      }>(
        `SELECT f.date, f.commentaire, f.cote_effort, f.lien_activite, u.nom, u.prenom
         FROM feedback f
         JOIN users u ON u.id = f.id_athlete
         WHERE f.id_seance = $1`,
        [id_seance]
      );

      ctx.response.body = result.rows;
    } else {
      const result = await client.queryObject<{
        date: string;
        commentaire: string;
        cote_effort: number;
        lien_activite: string;
      }>(
        "SELECT date, commentaire, cote_effort, lien_activite FROM feedback"
      );

      ctx.response.body = result.rows;
    }
  } finally {
    client.release();
  }
});

// Feedback d’un athlète pour une séance (coach)
router.get("/feedbacks-athlete-seance/:id_athlete/:id_seance", async (ctx: Context) => {
  const id_athlete = Number(ctx.params.id_athlete);
  const id_seance = Number(ctx.params.id_seance);
  if (Number.isNaN(id_athlete) || Number.isNaN(id_seance)) {
    ctx.response.status = 400;
    ctx.response.body = { message: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{
      date: string;
      commentaire: string;
      cote_effort: number;
      lien_activite: string;
    }>(
      `SELECT date, commentaire, cote_effort, lien_activite
       FROM feedback
       WHERE id_athlete = $1 AND id_seance = $2`,
      [id_athlete, id_seance]
    );

    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

// Enregistrement ou mise à jour du feedback (athlète)
router.post("/feedbacks", requireRole("athlete"), async (ctx: Context) => {
  const { id_seance, commentaire, cote_effort, lien_activite } = await ctx.request.body({ type: "json" }).value;
  const id_athlete = ctx.state.user?.id;
  const date = new Date().toISOString().split("T")[0];

  if (!id_seance || !id_athlete) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Champs obligatoires manquants." };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject(
      `INSERT INTO feedback (commentaire, cote_effort, date, lien_activite, id_athlete, id_seance)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id_athlete, id_seance) DO UPDATE SET
         commentaire = EXCLUDED.commentaire,
         cote_effort = EXCLUDED.cote_effort,
         date = EXCLUDED.date,
         lien_activite = EXCLUDED.lien_activite`,
      [commentaire, cote_effort, date, lien_activite || null, id_athlete, id_seance]
    );

    ctx.response.status = 201;
    ctx.response.body = { message: "Feedback enregistré (ou mis à jour)" };
  } finally {
    client.release();
  }
});

// Feedback d’un athlète connecté pour une séance
router.get("/feedbacks-user/:id_seance", requireRole("athlete"), async (ctx: Context) => {
  const id_seance = Number(ctx.params.id_seance);
  const id_athlete = ctx.state.user?.id;

  if (Number.isNaN(id_seance) || !id_athlete) {
    ctx.response.status = 400;
    ctx.response.body = { message: "ID ou utilisateur invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{
      commentaire: string;
      cote_effort: number;
      lien_activite: string;
    }>(
      `SELECT commentaire, cote_effort, lien_activite
       FROM feedback
       WHERE id_seance = $1 AND id_athlete = $2`,
      [id_seance, id_athlete]
    );

    ctx.response.body = result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    client.release();
  }
});

export default router;
