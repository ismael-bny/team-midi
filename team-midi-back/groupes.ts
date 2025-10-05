import { Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { getClient } from "./database.ts";
import { requireRole } from "./middlewares.ts";

const router = new Router();

// Création d’un groupe
router.post("/groupes", requireRole("coach"), async (ctx) => {
  const { nom, id_coach } = await ctx.request.body({ type: "json" }).value;
  if (!nom || !id_coach) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Champs requis manquants." };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject("INSERT INTO groupe (nom, id_coach) VALUES ($1, $2)", [nom, id_coach]);
    ctx.response.status = 201;
    ctx.response.body = { message: "Groupe créé." };
  } finally {
    client.release();
  }
});

// Suppression d’un groupe
router.delete("/groupes/:id", requireRole("coach"), async (ctx) => {
  const id_groupe = Number(ctx.params.id);
  if (Number.isNaN(id_groupe)) {
    ctx.response.status = 400;
    ctx.response.body = { message: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject("UPDATE users SET id_groupe = NULL WHERE id_groupe = $1", [id_groupe]);
    await client.queryObject("DELETE FROM groupe WHERE id_groupe = $1", [id_groupe]);
    ctx.response.body = { message: "Groupe supprimé." };
  } finally {
    client.release();
  }
});

// Ajouter un athlète à un groupe
router.post("/groupes/:id/ajouter-athlete", requireRole("coach"), async (ctx) => {
  const id_groupe = Number(ctx.params.id);
  const { id_athlete } = await ctx.request.body({ type: "json" }).value;

  if (Number.isNaN(id_groupe) || !id_athlete) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Paramètres requis invalides." };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{ type: string }>(
      "SELECT type FROM users WHERE id = $1",
      [id_athlete]
    );

    if (result.rows.length === 0 || result.rows[0].type !== "athlete") {
      ctx.response.status = 400;
      ctx.response.body = { message: "Utilisateur non trouvé ou n'est pas un athlète." };
      return;
    }

    await client.queryObject("UPDATE users SET id_groupe = $1 WHERE id = $2", [id_groupe, id_athlete]);
    ctx.response.status = 200;
    ctx.response.body = { message: "Athlète ajouté au groupe." };
  } finally {
    client.release();
  }
});

// Retirer un athlète
router.delete("/groupes/:id/athletes/:id_athlete", requireRole("coach"), async (ctx) => {
  const id_athlete = Number(ctx.params.id_athlete);
  if (Number.isNaN(id_athlete)) {
    ctx.response.status = 400;
    ctx.response.body = { message: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    await client.queryObject("UPDATE users SET id_groupe = NULL WHERE id = $1", [id_athlete]);
    ctx.response.body = { message: "Athlète retiré du groupe." };
  } finally {
    client.release();
  }
});

// Liste des groupes d’un coach
router.get("/groupes/:coach_id", async (ctx) => {
  const id_coach = Number(ctx.params.coach_id);
  if (Number.isNaN(id_coach)) {
    ctx.response.status = 400;
    ctx.response.body = { message: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{ id_groupe: number; nom: string }>(
      "SELECT id_groupe, nom FROM groupe WHERE id_coach = $1",
      [id_coach]
    );
    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

// Liste des athlètes d’un groupe
router.get("/groupes/:id/athletes", async (ctx) => {
  const id_groupe = Number(ctx.params.id);
  if (Number.isNaN(id_groupe)) {
    ctx.response.status = 400;
    ctx.response.body = { message: "ID invalide" };
    return;
  }

  const client = await getClient();
  try {
    const result = await client.queryObject<{ id: number; nom: string; prenom: string }>(
      "SELECT id, nom, prenom FROM users WHERE id_groupe = $1 AND type = 'athlete'",
      [id_groupe]
    );
    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

// Recherche d’athlètes non assignés
router.get("/recherche-athletes", async (ctx) => {
  const q = ctx.request.url.searchParams.get("q") || "";
  const client = await getClient();
  try {
    const result = await client.queryObject<{
      id: number;
      nom: string;
      prenom: string;
      login: string;
      email: string;
    }>(
      `SELECT id, nom, prenom, login, email FROM users
       WHERE type = 'athlete' AND id_groupe IS NULL
         AND (nom ILIKE $1 OR prenom ILIKE $1 OR login ILIKE $1 OR email ILIKE $1)`,
      [`%${q}%`]
    );
    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

// Feedbacks d’un athlète
router.get("/feedbacks-athlete/:id", async (ctx) => {
  const id_athlete = Number(ctx.params.id);
  if (Number.isNaN(id_athlete)) {
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
      titre: string;
    }>(
      `SELECT f.date, f.commentaire, f.cote_effort, f.lien_activite, s.titre
       FROM feedback f
       JOIN seance s ON s.id_seance = f.id_seance
       WHERE f.id_athlete = $1
       ORDER BY f.date DESC`,
      [id_athlete]
    );
    ctx.response.body = result.rows;
  } finally {
    client.release();
  }
});

export default router;
