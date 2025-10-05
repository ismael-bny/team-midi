import { API_URL } from "./config.mjs";

// Écoute la soumission du formulaire d'inscription
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // empêche le rechargement de la page

  const form = e.target;
  const data = {
    nom: form.nom.value,
    prenom: form.prenom.value,
    login: form.login.value,
    mot_de_passe: form.mot_de_passe.value,
    email: form.email.value,
    type: form.type.value // coach ou athlète
  };

  // Envoie les infos d'inscription au backend
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include"
  });

  const result = await res.json();
  if (res.ok) {
    alert("Inscription réussie, vous pouvez vous connecter.");
    window.location.href = "login.html";
  } else {
    alert(result.message);
  }
});
