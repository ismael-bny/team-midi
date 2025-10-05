// team-midi-front/public/config.mjs
export const API_URL = location.hostname.includes("localhost")
  ? "http://localhost:8000"        // back local
  : "/api";                        // en prod: passe par le proxy Nginx

export const WS_URL = location.hostname.includes("localhost")
  ? "ws://localhost:8000/ws"       // WS local
  : `wss://${location.host}/api/ws`; // WS via proxy en prod
