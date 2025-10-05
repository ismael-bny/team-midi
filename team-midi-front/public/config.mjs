export const API_URL = location.hostname.includes("localhost")
  ? "http://localhost:8000"
  : "https://ismael-benayed-back.cluster-ig3.igpolytech.fr";

export const WS_URL = location.hostname.includes("localhost")
  ? "ws://localhost:8000/ws"
  : "wss://ismael-benayed-back.cluster-ig3.igpolytech.fr/ws";
