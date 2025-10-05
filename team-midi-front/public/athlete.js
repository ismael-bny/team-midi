import { API_URL } from "./config.mjs";

// Récupère l'ID de l'athlète depuis l'URL (ex: ?id=3)
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// Affiche le nom de l'athlète en haut de la page
async function chargerNomAthlete() {
  const res = await fetch(`${API_URL}/athlete/${id}`, { credentials: "include" });
  if (res.ok) {
    const athlete = await res.json();
    const titre = document.getElementById("athleteNom");
    titre.textContent = `Planning de ${athlete.prenom} ${athlete.nom}`;
  }
}

// Charge les séances et compétitions dans le calendrier
async function chargerSeances() {
  const [resSeances, resCompetitions] = await Promise.all([
    fetch(`${API_URL}/seances-athlete/${id}`),
    fetch(`${API_URL}/competitions-athlete/${id}`)
  ]);

  const seances = resSeances.ok ? await resSeances.json() : [];
  const competitions = resCompetitions.ok ? await resCompetitions.json() : [];

  // Prépare les événements à afficher dans le calendrier
  const events = [
    ...seances.map(s => ({
      title: s.titre,
      start: s.date,
      allDay: true,
      extendedProps: {
        description: s.description,
        id_seance: s.id_seance
      }
    })),
    ...competitions.map(c => ({
      title: `${c.nom}`,
      start: c.date,
      allDay: true,
      color: "red",
      extendedProps: {
        description: `Ville : ${c.ville}\nNiveau : ${c.niveau}\nType : ${c.type}`
      }
    }))
  ];

  // Initialisation du calendrier FullCalendar
  const calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
    initialView: "dayGridWeek",
    firstDay: 1,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: ""
    },
    locale: "fr",
    events,
    eventClick(info) {
      const idSeance = info.event.extendedProps.id_seance;
      if (idSeance) {
        // Affiche les détails du feedback pour la séance
        afficherFeedbackSeance(idSeance);
      } else {
        // Affiche les détails de la compétition
        afficherModalCompetition(
          info.event.title,
          info.event.extendedProps.description.replace(/\n/g, "<br>")
        );
      }
    }
  });

  calendar.render();
}

// Lance les requêtes dès que la page charge
chargerNomAthlete();
chargerSeances();

// Affiche les feedbacks d'une séance dans une modale
async function afficherFeedbackSeance(id_seance) {
  fermerModalCompetition();
  try {
    const res = await fetch(`${API_URL}/feedbacks-athlete-seance/${id}/${id_seance}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const feedbacks = await res.json();
    const container = document.getElementById("contenuModalFeedbackSeance");
    container.innerHTML = "";

    if (!feedbacks.length) {
      container.textContent = "Aucun feedback pour cette séance.";
    } else {
      const f = feedbacks[0];
      container.innerHTML = `
        <p><strong>Date :</strong> ${f.date}</p>
        <p><strong>Commentaire :</strong> ${f.commentaire || "(aucun)"}</p>
        <p><strong>Cote d'effort :</strong> ${f.cote_effort ?? "(non précisée)"}</p>
        ${f.lien_activite ? `<p><a href="${f.lien_activite}" target="_blank">Lien activité</a></p>` : ""}
      `;
    }

    document.getElementById("modalFeedbackSeance").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } catch (err) {
    console.error("Erreur lors du chargement du feedback :", err);
    alert("Impossible de charger le feedback.");
  }
}

// Ferme la modale de feedback
function fermerModalFeedbackSeance() {
  document.getElementById("modalFeedbackSeance").classList.add("hidden");
  document.body.style.overflow = "auto";
}

// Affiche les détails d'une compétition dans une modale
function afficherModalCompetition(titre, description) {
  fermerModalFeedbackSeance();
  document.getElementById("modalCompetitionTitre").textContent = titre;
  document.getElementById("modalCompetitionDescription").innerHTML = description;
  document.getElementById("modalCompetition").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

// Ferme la modale de compétition
function fermerModalCompetition() {
  document.getElementById("modalCompetition").classList.add("hidden");
  document.body.style.overflow = "auto";
}

window.fermerModalFeedbackSeance = fermerModalFeedbackSeance;
window.fermerModalCompetition = fermerModalCompetition;
