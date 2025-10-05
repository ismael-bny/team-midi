import { Router, Context } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { getClient } from "./database.ts";
import { requireRole } from "./middlewares.ts";
import { broadcastNouvelleSeance } from "./routes.ts";

const router = new Router();

// Création d'une séance d'entraînement (coach uniquement)
router.post("/seance", requireRole("coach"), async (ctx) => {
  const { titre, description, date, id_groupe } = await ctx.request.body({ type: "json" }).value;
  const id_coach = ctx.state.user?.id;

  if (!titre || !description || !date || !id_groupe || !id_coach) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Champs requis manquants." };
    return;
  }

  const client = await getClient();
  try {
  await client.queryObject(
    "INSERT INTO seance (titre, description, date, id_coach, id_groupe) VALUES ($1, $2, $3::date, $4, $5)",
    [titre, description, date, id_coach, id_groupe]
  );

    // Envoie une notification via WebSocket aux athlètes connectés
    broadcastNouvelleSeance(`Nouvelle séance créée par le coach !!!`);

    ctx.response.status = 201;
    ctx.response.body = { message: "Séance créée" };
  } finally {
    client.release();
  }
});

// Récupération d'une séance par son id (coach uniquement)
router.get("/seances/:id", requireRole("coach"), async (ctx) => {
  const id_seance = Number(ctx.params.id);
  if (Number.isNaN(id_seance)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID de séance invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{
      id_seance: number;
      titre: string;
      description: string;
      date: string;
      id_groupe: number;
    }>(
      `SELECT id_seance, titre, description, to_char(date, 'YYYY-MM-DD') AS date, id_groupe
       FROM seance
       WHERE id_seance = $1`,
      [id_seance]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Séance introuvable" };
      return;
    }

    ctx.response.body = result.rows[0];
  } finally {
    client.release();
  }
});

// Modification d'une séance (coach uniquement)
router.put("/seances/:id", requireRole("coach"), async (ctx) => {
  const id = Number(ctx.params.id);
  const { titre, description, date, id_groupe } = await ctx.request.body({ type: "json" }).value;

  if (Number.isNaN(id) || !titre || !date || !id_groupe) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Champs requis manquants ou ID invalide." };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject(
      `UPDATE seance
       SET titre = $1, description = $2, date = $3::date, id_groupe = $4
       WHERE id_seance = $5`,
      [titre, description, date, id_groupe, id]
    );

    ctx.response.body = { message: "Séance mise à jour" };
  } finally {
    client.release();
  }
});

// Suppression d'une séance (coach uniquement)
router.delete("/seances/:id", requireRole("coach"), async (ctx) => {
  const id = Number(ctx.params.id);
  if (Number.isNaN(id)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject("DELETE FROM seance WHERE id_seance = $1", [id]);
    ctx.response.body = { message: "Séance supprimée" };
  } finally {
    client.release();
  }
});

// Récupère toutes les séances accessibles à un athlète (via son groupe)
router.get("/seances-athlete/:id_athlete", async (ctx) => {
  const id_athlete = Number(ctx.params.id_athlete);
  if (Number.isNaN(id_athlete)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const groupeData = await client.queryObject<{ id_groupe: number | null }>(
      "SELECT id_groupe FROM users WHERE id = $1",
      [id_athlete]
    );

    if (groupeData.rows.length === 0 || groupeData.rows[0].id_groupe === null) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Athlète sans groupe ou inexistant" };
      return;
    }

    const id_groupe = groupeData.rows[0].id_groupe;

    const result = await client.queryObject<{
      id_seance: number;
      titre: string;
      description: string;
      date: string;
    }>(
      "SELECT id_seance, titre, description, date FROM seance WHERE id_groupe = $1 ORDER BY date ASC",
      [id_groupe]
    );

    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

// Récupère toutes les séances d'un coach (utilisé pour le calendrier admin)
router.get("/seances-coach/:id", async (ctx) => {
  const id_coach = Number(ctx.params.id);
  if (Number.isNaN(id_coach)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{
      id_seance: number;
      titre: string;
      description: string;
      date: string;
    }>(
      "SELECT id_seance, titre, description, to_char(date, 'YYYY-MM-DD') AS date FROM seance WHERE id_coach = $1 ORDER BY date ASC",
      [id_coach]
    );

    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

export default router;
