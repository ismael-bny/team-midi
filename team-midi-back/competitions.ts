import { Router, Context } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { getClient } from "./database.ts";
import { requireRole } from "./middlewares.ts";

const router = new Router();

// Retourne toutes les compétitions (accès public)
router.get("/competitions", async (ctx: Context) => {
  const client = await getClient();
  try {
    const result = await client.queryObject<{
      id_competition: number;
      nom: string;
      date: string;
      ville: string;
      niveau: string;
      type: string;
      id_groupe: number;
    }>(
      `SELECT id_competition, nom, to_char(date, 'YYYY-MM-DD') AS date, ville, niveau, type, id_groupe
       FROM competition`
    );

    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

// Création d'une nouvelle compétition (coach uniquement)
router.post("/competitions", requireRole("coach"), async (ctx: Context) => {
  const { nom, date, ville, niveau, type, id_groupe } = await ctx.request.body({ type: "json" }).value;

  if (!nom || !date || !ville || !niveau || !type || !id_groupe) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Tous les champs sont requis." };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject(
      `INSERT INTO competition (nom, date, ville, niveau, type, id_groupe)
       VALUES ($1, $2::date, $3, $4, $5, $6)`,
      [nom, date, ville, niveau, type, id_groupe]
    );
    ctx.response.status = 201;
    ctx.response.body = { message: "Compétition ajoutée" };
  } finally {
    client.release();
  }
});

// Récupération des détails d'une compétition (coach uniquement)
router.get("/competitions/:id", requireRole("coach"), async (ctx: Context) => {
  const id = Number(ctx.params.id);
  if (Number.isNaN(id)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{
      id_competition: number;
      nom: string;
      date: string;
      ville: string;
      niveau: string;
      type: string;
      id_groupe: number;
    }>(
      `SELECT id_competition, nom, to_char(date, 'YYYY-MM-DD') AS date, ville, niveau, type, id_groupe
       FROM competition
       WHERE id_competition = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Compétition introuvable" };
      return;
    }

    ctx.response.body = result.rows[0];
  } finally {
    client.release();
  }
});

// Mise à jour d'une compétition (coach uniquement)
router.put("/competitions/:id", requireRole("coach"), async (ctx: Context) => {
  const id = Number(ctx.params.id);
  const { nom, date, ville, niveau, type, id_groupe } = await ctx.request.body({ type: "json" }).value;

  if (Number.isNaN(id) || !nom || !date || !ville || !niveau || !type || !id_groupe) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Champs requis manquants ou ID invalide." };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject(
      `UPDATE competition
       SET nom = $1, date = $2::date, ville = $3, niveau = $4, type = $5, id_groupe = $6
       WHERE id_competition = $7`,
      [nom, date, ville, niveau, type, id_groupe, id]
    );
    ctx.response.body = { message: "Compétition mise à jour" };
  } finally {
    client.release();
  }
});

// Suppression d'une compétition (coach uniquement)
router.delete("/competitions/:id", requireRole("coach"), async (ctx: Context) => {
  const id = Number(ctx.params.id);
  if (Number.isNaN(id)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject(
      `DELETE FROM competition WHERE id_competition = $1 RETURNING id_competition`,
      [id]
    );

    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Compétition introuvable ou déjà supprimée" };
      return;
    }

    ctx.response.body = { message: "Compétition supprimée" };
  } finally {
    client.release();
  }
});

// Liste des compétitions créées par un coach donné
router.get("/competitions/coach/:id", requireRole("coach"), async (ctx: Context) => {
  const id_coach = Number(ctx.params.id);
  if (Number.isNaN(id_coach)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{
      id_competition: number;
      nom: string;
      date: string;
      ville: string;
      niveau: string;
      type: string;
      id_groupe: number;
    }>(
      `SELECT c.id_competition, c.nom, to_char(c.date, 'YYYY-MM-DD') AS date, c.ville, c.niveau, c.type, c.id_groupe
       FROM competition c
       JOIN groupe g ON c.id_groupe = g.id_groupe
       WHERE g.id_coach = $1`,
      [id_coach]
    );

    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

// Liste des compétitions accessibles à un athlète (via son groupe)
router.get("/competitions-athlete/:id_athlete", async (ctx: Context) => {
  const id_athlete = Number(ctx.params.id_athlete);
  if (Number.isNaN(id_athlete)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const groupe = await client.queryObject<{ id_groupe: number | null }>(
      "SELECT id_groupe FROM users WHERE id = $1",
      [id_athlete]
    );

    if (groupe.rows.length === 0 || groupe.rows[0].id_groupe === null) {
      ctx.response.body = [];
      return;
    }

    const id_groupe = groupe.rows[0].id_groupe;

    const result = await client.queryObject<{
      id_competition: number;
      nom: string;
      date: string;
      ville: string;
      niveau: string;
      type: string;
    }>(
      `SELECT id_competition, nom, to_char(date, 'YYYY-MM-DD') AS date, ville, niveau, type
       FROM competition
       WHERE id_groupe = $1`,
      [id_groupe]
    );

    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

export default router;
