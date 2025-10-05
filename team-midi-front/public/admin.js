import { API_URL } from "./config.mjs";

let calendar;
let dateSelectionnee = null;

// Déconnexion : supprime le cookie et redirige vers la page de login
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch(`${API_URL}/logout`, {
    method: "GET",
    credentials: "include"
  });
  window.location.href = "login.html";
});

// Vérifie si l'utilisateur est authentifié, puis charge les données
async function checkAuth() {
  const res = await fetch(`${API_URL}/verify`, {
    method: "GET",
    credentials: "include"
  });
  if (!res.ok) return window.location.href = "login.html";

  const data = await res.json();
  window.user = data.user;

  await chargerGroupes();
  await chargerSeances();
  await chargerCompetitions();
}

// Crée un groupe d'entraînement
async function creerGroupe() {
  const nom = document.getElementById("groupName").value;
  if (!nom) return alert("Nom requis");

  await fetch(`${API_URL}/groupes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ nom, id_coach: window.user.id })
  });

  document.getElementById("groupName").value = "";
  await chargerGroupes();
}

// Charge les groupes du coach et affiche les athlètes dans chaque groupe
async function chargerGroupes() {
  try {
    const res = await fetch(`${API_URL}/groupes/${window.user.id}`);
    if (!res.ok) throw new Error(`Erreur groupes: ${res.status}`);

    let groupes = await res.json();

    // Corrige les clés si le backend renvoie encore "id_groupe"
    groupes = groupes.map(g => ({
      ...g,
      id: g.id ?? g.id_groupe
    }));

    const ul = document.getElementById("mesGroupes");
    const select = document.getElementById("groupeSelect");
    const selectModal = document.getElementById("groupeSelectModal");
    ul.innerHTML = "";
    select.innerHTML = "";
    selectModal.innerHTML = "";

    for (const g of groupes) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${g.nom}</strong> <button onclick="supprimerGroupe(${g.id})">🗑</button>`;

      const subList = document.createElement("ul");

      try {
        const resAthletes = await fetch(`${API_URL}/groupes/${g.id}/athletes`);
        if (!resAthletes.ok) throw new Error(`Erreur fetch athletes groupe ${g.id} : ${resAthletes.status}`);
        const athletes = await resAthletes.json();

        if (!Array.isArray(athletes)) {
          console.error(`Athletes n'est pas un tableau pour groupe ${g.id}:`, athletes);
          continue;
        }

        for (const a of athletes) {
          const athleteLi = document.createElement("li");
          athleteLi.innerHTML = `
            <a href="athlete.html?id=${a.id}" target="_blank">${a.prenom} ${a.nom}</a>
            <button onclick="retirerAthlete(${g.id}, ${a.id})">❌</button>`;
          subList.appendChild(athleteLi);
        }

      } catch (err) {
        console.error("Erreur lors du chargement des athlètes :", err);
      }

      li.appendChild(subList);
      ul.appendChild(li);

      select.appendChild(new Option(g.nom, g.id));
      selectModal.appendChild(new Option(g.nom, g.id));
    }

    if (groupes.length > 0) {
      select.value = groupes[0].id;
      selectModal.value = groupes[0].id;
    }

    remplirSelectCompetitions(groupes);

  } catch (err) {
    console.error("Erreur lors du chargement des groupes :", err);
    alert("Impossible de charger les groupes.");
  }
}

// Recherche d’athlètes non assignés à un groupe
async function rechercherAthletes() {
  const q = document.getElementById("rechercheAthlete").value;
  const res = await fetch(`${API_URL}/recherche-athletes?q=${encodeURIComponent(q)}`);
  const athletes = await res.json();

  const ul = document.getElementById("resultatsRecherche");
  ul.innerHTML = "";

  for (const a of athletes) {
    const li = document.createElement("li");
    li.textContent = `${a.prenom} ${a.nom} (${a.login})`;
    const btn = document.createElement("button");
    btn.textContent = "Ajouter";
    btn.onclick = () => ajouterAthlete(a.id);
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

// Ajoute un athlète à un groupe
async function ajouterAthlete(id_athlete) {
  const id_groupe = document.getElementById("groupeSelect").value;

  await fetch(`${API_URL}/groupes/${id_groupe}/ajouter-athlete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id_athlete })
  });

  alert("Athlète ajouté !");
  await chargerGroupes();
}

// Supprime un groupe d'entraînement
async function supprimerGroupe(id) {
  if (!confirm("Supprimer ce groupe ?")) return;

  await fetch(`${API_URL}/groupes/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  await chargerGroupes();
}

// Retire un athlète d’un groupe
async function retirerAthlete(id_groupe, id_athlete) {
  if (!confirm("Retirer cet athlète du groupe ?")) return;

  await fetch(`${API_URL}/groupes/${id_groupe}/athletes/${id_athlete}`, {
    method: "DELETE",
    credentials: "include"
  });

  await chargerGroupes();
}

// Enregistre une nouvelle séance depuis la modale
async function enregistrerSeance() {
  const titre = document.getElementById("titreSeance").value;
  const description = document.getElementById("descSeance").value;
  const date = dateSelectionnee;
  const id_groupe = document.getElementById("groupeSelectModal").value;

  if (!titre || !description || !date || !id_groupe) {
    return alert("Tous les champs sont requis.");
  }

  const res = await fetch(`${API_URL}/seance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    mode: "cors",
    body: JSON.stringify({ titre, description, date, id_groupe })
  });

  if (res.ok) {
    alert("Séance créée !");
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("titreSeance").value = "";
    document.getElementById("descSeance").value = "";

    await chargerSeances();
    await chargerCompetitions();
  } else {
    alert("Erreur lors de la création de la séance.");
  }
}

// Modifier une séance
async function modifierSeance(id) {
  fermerModalInfo();

  const res = await fetch(`${API_URL}/seances/${id}`, {
    credentials: "include"
  });

  if (!res.ok) {
    alert("Erreur lors de la récupération de la séance.");
    return;
  }

  const seance = await res.json();

  document.getElementById("titreSeance").value = seance.titre;
  document.getElementById("descSeance").value = seance.description;
  document.getElementById("groupeSelectModal").value = seance.id_groupe;

  dateSelectionnee = seance.date.length > 10 ? seance.date.slice(0, 10) : seance.date;

  document.getElementById("modal").classList.remove("hidden");

  const bouton = document.querySelector("#modal button[onclick]");
  bouton.textContent = "Mettre à jour";

  const nouveauHandler = async () => {
    const titre = document.getElementById("titreSeance").value;
    const description = document.getElementById("descSeance").value;
    const id_groupe = document.getElementById("groupeSelectModal").value;
    const formattedDate = dateSelectionnee;

    await fetch(`${API_URL}/seances/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ titre, description, date: formattedDate, id_groupe })
    });

    alert("Séance modifiée !");
    document.getElementById("modal").classList.add("hidden");
    bouton.textContent = "Enregistrer";

    // Nettoie et réattribue à la création standard
    bouton.removeEventListener("click", nouveauHandler);
    bouton.setAttribute("onclick", "enregistrerSeance()");

    await chargerSeances();
    await chargerCompetitions();
  };

  bouton.removeAttribute("onclick");
  bouton.addEventListener("click", nouveauHandler);
}

// Supprime une séance
async function supprimerSeance(id) {
  if (!confirm("Supprimer cette séance ?")) return;

  await fetch(`${API_URL}/seances/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  fermerModalInfo();
  calendar.removeAllEvents();
  await chargerSeances();
  await chargerCompetitions();
}

// Charge toutes les séances du coach (affichage dans le calendrier)
async function chargerSeances() {
  const res = await fetch(`${API_URL}/seances-coach/${window.user.id}`);
  const seances = await res.json();

  const events = seances.map(s => ({
    id: s.id_seance,
    title: s.titre,
    start: s.date,
    extendedProps: {
      description: s.description
    }
  }));

  const calendarEl = document.getElementById("calendar");

  if (!calendar) {
    // Initialise FullCalendar si ce n’est pas encore fait
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridWeek",
      firstDay: 1,
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: ""
      },
      locale: "fr",
      events,
      dateClick(info) {
        // Prépare la création de séance à la date cliquée
        fermerModalInfo();
        fermerModalCompetition();
        dateSelectionnee = info.dateStr;

        document.getElementById("titreSeance").value = "";
        document.getElementById("descSeance").value = "";
        document.getElementById("groupeSelectModal").selectedIndex = 0;

        const bouton = document.querySelector("#modal button[onclick^='enregistrerSeance'], #modal button");
        bouton.textContent = "Enregistrer";
        bouton.setAttribute("onclick", "enregistrerSeance()");

        document.getElementById("modal").classList.remove("hidden");
      },
      eventClick(info) {
        document.getElementById("modal").classList.add("hidden");
        const id = info.event.id;
        const title = info.event.title;
        const description = info.event.extendedProps.description;

        if (id.toString().startsWith("comp-")) {
          const idSplit = id.split("-");
          if (idSplit.length === 2 && !isNaN(Number(idSplit[1]))) {
            const compId = Number(idSplit[1]);
            afficherModalInfo(title, description, null, compId);
          } else {
            console.warn("ID compétition invalide :", id);
          }
        } else {
          afficherModalInfo(title, description, id);
        }
      }
    });
    calendar.render();
  } else {
    calendar.removeAllEvents();
    calendar.addEventSource(events);
  }
}

// Charge les compétitions du coach dans le calendrier
async function chargerCompetitions() {
  const res = await fetch(`${API_URL}/competitions/coach/${window.user.id}`, {
    credentials: "include"
  });
  const competitions = await res.json();

  const events = competitions.map(c => ({
   id: `comp-${c.id_competition}`,
    title: `${c.nom}`,
    start: c.date,
    color: "red",
    extendedProps: {
      description: `Ville : ${c.ville}<br>Niveau : ${c.niveau}<br>Type : ${c.type}`
    }
  }));

  if (calendar) {
    calendar.addEventSource(events);
  }
}

// Remplit les listes déroulantes de sélection de groupe pour une compétition
function remplirSelectCompetitions(groupes) {
  const selectComp = document.getElementById("groupeSelectCompetition");
  selectComp.innerHTML = "";

  for (const g of groupes) {
    selectComp.appendChild(new Option(g.nom, g.id));
  }

  if (groupes.length > 0) {
    selectComp.value = groupes[0].id;
  }

  const selectEditComp = document.getElementById("editGroupeComp");
  if (selectEditComp) {
    selectEditComp.innerHTML = "";
    for (const g of groupes) {
      selectEditComp.appendChild(new Option(g.nom, g.id));
    }
  }
}

// Affiche la modale d’infos d’une séance ou d'une compétition
function afficherModalInfo(titre, description, idSeance = null, idCompetition = null) {
  document.getElementById("modalInfoTitre").textContent = titre;
  document.getElementById("modalInfoDescription").innerHTML = description;

  const buttons = document.getElementById("modalInfoButtons");
  buttons.innerHTML = "";

  if (idSeance) {
    const btnFeedback = document.createElement("button");
    btnFeedback.textContent = "Voir les feedbacks";
    btnFeedback.onclick = () => {
      window.location.href = `feedbacks.html?id_seance=${idSeance}`;
    };

    const btnModifier = document.createElement("button");
    btnModifier.textContent = "Modifier";
    btnModifier.onclick = () => modifierSeance(idSeance);

    const btnSupprimer = document.createElement("button");
    btnSupprimer.textContent = "Supprimer";
    btnSupprimer.onclick = () => supprimerSeance(idSeance);

    buttons.appendChild(btnFeedback);
    buttons.appendChild(btnModifier);
    buttons.appendChild(btnSupprimer);
  }

  if (typeof idCompetition === "number" && !isNaN(idCompetition)) {
    const btnModifier = document.createElement("button");
    btnModifier.textContent = "Modifier";
    btnModifier.onclick = () => modifierCompetitionViaModal(idCompetition);

    const btnSupprimer = document.createElement("button");
    btnSupprimer.textContent = "Supprimer";
    btnSupprimer.onclick = () => supprimerCompetition(idCompetition);

    buttons.appendChild(btnModifier);
    buttons.appendChild(btnSupprimer);
  }

  document.getElementById("modalInfo").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

// Ferme la modale d'information
function fermerModalInfo() {
  document.getElementById("modalInfo").classList.add("hidden");
  document.body.style.overflow = "auto";
}

let currentCompetitionId = null;

// Pré-remplit la modale d'édition d'une compétition
async function modifierCompetitionViaModal(id) {
  fermerModalInfo();
  currentCompetitionId = id;

  await chargerGroupes();

  const res = await fetch(`${API_URL}/competitions/${id}`, {
    credentials: "include"
  });

  if (!res.ok) {
    alert("Erreur lors de la récupération de la compétition.");
    return;
  }

  const data = await res.json();

  document.getElementById("editNomComp").value = data.nom;
  document.getElementById("editDateComp").value = data.date;
  document.getElementById("editVilleComp").value = data.ville;
  document.getElementById("editNiveauComp").value = data.niveau;
  document.getElementById("editTypeComp").value = data.type;
  document.getElementById("editGroupeComp").value = data.id_groupe;

  document.getElementById("modalCompetitionEdit").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

// Ferme la modale d'édition de compétition
function fermerModalCompetition() {
  const modal = document.getElementById("modalCompetitionEdit");
  if (modal) {
    modal.classList.add("hidden");
  }
  document.body.style.overflow = "auto";
  currentCompetitionId = null;
}

// Enregistre les modifications d'une compétition
async function validerModificationCompetition() {
  const data = {
    nom: document.getElementById("editNomComp").value,
    date: document.getElementById("editDateComp").value,
    ville: document.getElementById("editVilleComp").value,
    niveau: document.getElementById("editNiveauComp").value,
    type: document.getElementById("editTypeComp").value,
    id_groupe: parseInt(document.getElementById("editGroupeComp").value)
  };

  const res = await fetch(`${API_URL}/competitions/${currentCompetitionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data)
  });

  if (res.ok) {
    alert("Compétition modifiée !");
    fermerModalCompetition();
    calendar.removeAllEvents();
    await chargerSeances();
    await chargerCompetitions();
  } else {
    alert("Erreur lors de la modification.");
  }
}

// Supprime une compétition
async function supprimerCompetition(id) {
  if (!confirm("Supprimer cette compétition ?")) return;

  const res = await fetch(`${API_URL}/competitions/${id}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (res.ok) {
    alert("Compétition supprimée !");
    fermerModalInfo();
    calendar.removeAllEvents();
    await chargerSeances();
    await chargerCompetitions();
  } else {
    alert("Erreur lors de la suppression.");
  }
}


// Création d’une compétition via formulaire
document.getElementById("competitionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  data.id_groupe = parseInt(data.id_groupe);

  const res = await fetch(`${API_URL}/competitions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (res.ok) {
    alert("Compétition ajoutée !");
    form.reset();
    calendar.removeAllEvents();
    await chargerSeances();
    await chargerCompetitions();
  } else {
    alert("Erreur lors de la création.");
  }
});

// Lance la vérification de session dès le chargement de la page
checkAuth();

window.creerGroupe = creerGroupe;
window.rechercherAthletes = rechercherAthletes;
window.supprimerGroupe = supprimerGroupe;
window.retirerAthlete = retirerAthlete;
window.enregistrerSeance = enregistrerSeance;
window.fermerModalInfo = fermerModalInfo;
window.validerModificationCompetition = validerModificationCompetition;
window.fermerModalCompetition = fermerModalCompetition;
window.supprimerSeance = supprimerSeance;
