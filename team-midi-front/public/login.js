import { API_URL } from "./config.mjs";

// Écoute la soumission du formulaire de connexion
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // empêche le rechargement de la page

  const form = e.target;
  const data = {
    login: form.login.value,
    mot_de_passe: form.mot_de_passe.value
  };

  // Envoie des identifiants au backend
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include", // nécessaire pour envoyer/recevoir les cookies
    mode: "cors"
  });

  const result = await res.json();

  if (res.ok) {
    // Redirige selon le rôle de l'utilisateur
    window.location.href = result.type === "coach"
      ? "admin.html"
      : "user.html";
  } else {
    alert(result.message); // affiche un message d’erreur
  }
});
