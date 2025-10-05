import { API_URL, WS_URL } from "./config.mjs";

let selectedSeanceId = null;

// Exécution dès que le DOM est prêt
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logoutBtn").addEventListener("click", logout);
  checkAuth();
});

// Vérifie si l'utilisateur est connecté (athlète)
async function checkAuth() {
  const res = await fetch(`${API_URL}/verify`, {
    method: "GET",
    credentials: "include"
  });

  if (!res.ok) {
    window.location.href = "login.html";
  } else {
    const data = await res.json();
    window.user = data.user;
    chargerSeances();

    // Connexion à la WebSocket pour recevoir les notifications temps réel
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("WebSocket connecté");
      afficherNotification("Connecté au serveur en temps réel");
    };

    ws.onmessage = (event) => {
      afficherNotification("📢 " + event.data);
    };

    ws.onerror = () => {
      console.error("Erreur WebSocket");
      afficherNotification("Erreur WebSocket");
    };

    ws.onclose = () => {
      console.warn("WebSocket fermé");
      afficherNotification("Déconnecté du serveur temps réel");
    };
  }
}

// Déconnexion de l'utilisateur
async function logout() {
  await fetch(`${API_URL}/logout`, {
    method: "GET",
    credentials: "include"
  });
  window.location.href = "login.html";
}

// Récupère les séances et compétitions pour affichage dans le calendrier
async function chargerSeances() {
  const [resSeances, resCompetitions] = await Promise.all([
    fetch(`${API_URL}/seances-athlete/${window.user.id}`, { credentials: "include" }),
    fetch(`${API_URL}/competitions-athlete/${window.user.id}`, { credentials: "include" }),
  ]);

  const seances = resSeances.ok ? await resSeances.json() : [];
  const competitions = resCompetitions.ok ? await resCompetitions.json() : [];

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

  const calendarEl = document.getElementById("calendar");
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridWeek",
    firstDay: 1,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: ""
    },
    locale: "fr",
    events,
    eventClick: function(info) {
      const idSeance = info.event.extendedProps.id_seance;
      if (idSeance) {
        // Affiche les détails d’une séance avec option de feedback
        fermerModalCompetition();
        selectedSeanceId = idSeance;
        document.getElementById("seanceTitre").textContent = info.event.title;
        document.getElementById("seanceDescription").textContent = info.event.extendedProps.description;
        document.getElementById("modalSeanceDetail").classList.remove("hidden");
      } else {
        // Affiche les détails d’une compétition
        afficherModalCompetition(
          info.event.title,
          info.event.extendedProps.description.replace(/\n/g, "<br>")
        );
      }
    }
  });

  calendar.render();
}

// Ouvre la modale de feedback (remplie avec les données existantes si dispo)
async function ouvrirModal() {
  try {
    const res = await fetch(`${API_URL}/feedbacks-user/${selectedSeanceId}`, {
      credentials: "include"
    });

    let feedback = null;
    if (res.ok) {
      const text = await res.text(); // lecture brute
      if (text) {
        feedback = JSON.parse(text); // parse seulement si non vide
      }
    }

    document.getElementById("commentaire").value = feedback?.commentaire || "";
    document.getElementById("effort").value = feedback?.cote_effort || "";
    document.getElementById("lienActivite").value = feedback?.lien_activite || "";

    document.getElementById("modalFeedback").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  } catch (err) {
    console.error("Erreur lors de la récupération du feedback :", err);
    alert("Erreur de chargement du feedback.");
  }
}

// Ferme la modale de feedback
function fermerModal() {
  document.getElementById("modalFeedback").classList.add("hidden");
  document.body.style.overflow = "auto";
}

// Ouvre la modale de feedback à partir des détails d’une séance
function ouvrirFeedback() {
  document.getElementById("modalSeanceDetail").classList.add("hidden");
  ouvrirModal();
}

// Ferme la modale de détails d’une séance
function fermerModalDetail() {
  document.getElementById("modalSeanceDetail").classList.add("hidden");
}

// Envoie le feedback au serveur
async function envoyerFeedback() {
  const commentaire = document.getElementById("commentaire").value;
  const cote_effort = parseFloat(document.getElementById("effort").value);
  const lien_activite = document.getElementById("lienActivite").value;

  if (!selectedSeanceId || isNaN(cote_effort)) {
    return alert("Veuillez remplir tous les champs obligatoires.");
  }

  const res = await fetch(`${API_URL}/feedbacks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      commentaire,
      cote_effort,
      lien_activite,
      id_seance: selectedSeanceId
    })
  });

  if (res.ok) {
    alert("Feedback envoyé !");
    fermerModal();
    document.getElementById("commentaire").value = "";
    document.getElementById("effort").value = "";
    document.getElementById("lienActivite").value = "";
  } else {
    alert("Erreur lors de l'envoi du feedback.");
  }
}

// Affiche une compétition dans une modale
function afficherModalCompetition(titre, description) {
  fermerModalDetail();
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

// Affiche un message temporaire en haut de l’écran (notifications WebSocket)
function afficherNotification(message) {
  let notif = document.getElementById("notifBar");
  if (!notif) {
    notif = document.createElement("div");
    notif.id = "notifBar";
    notif.style.position = "fixed";
    notif.style.top = "0";
    notif.style.left = "0";
    notif.style.right = "0";
    notif.style.padding = "1rem";
    notif.style.backgroundColor = "#4caf50";
    notif.style.color = "white";
    notif.style.textAlign = "center";
    notif.style.zIndex = "9999";
    document.body.appendChild(notif);
  }

  notif.textContent = message;

  setTimeout(() => {
    notif.remove();
  }, 4000);
}

window.ouvrirFeedback = ouvrirFeedback;
window.fermerModalDetail = fermerModalDetail;
window.envoyerFeedback = envoyerFeedback;
window.fermerModal = fermerModal;
window.fermerModalCompetition = fermerModalCompetition;
