CREATE TABLE IF NOT EXISTS groupe (
  id_groupe SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  id_coach INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  type TEXT CHECK(type IN ('coach', 'athlete')) NOT NULL,
  id_groupe INTEGER,
  FOREIGN KEY (id_groupe) REFERENCES groupe(id_groupe) ON DELETE SET NULL
);

ALTER TABLE groupe
ADD CONSTRAINT fk_groupe_coach FOREIGN KEY (id_coach) REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS seance (
  id_seance SERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  id_coach INTEGER NOT NULL,
  id_groupe INTEGER NOT NULL,
  FOREIGN KEY (id_coach) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_groupe) REFERENCES groupe(id_groupe) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
  id_feedback SERIAL PRIMARY KEY,
  commentaire TEXT,
  cote_effort REAL,
  date DATE NOT NULL,
  lien_activite TEXT,
  id_athlete INTEGER NOT NULL,
  id_seance INTEGER NOT NULL,
  FOREIGN KEY (id_athlete) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_seance) REFERENCES seance(id_seance) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS competition (
  id_competition SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  date DATE NOT NULL,
  ville TEXT NOT NULL,
  niveau TEXT NOT NULL,
  type TEXT NOT NULL,
  id_groupe INTEGER NOT NULL,
  FOREIGN KEY (id_groupe) REFERENCES groupe(id_groupe) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_feedback ON feedback(id_athlete, id_seance);
