// Utilidad para construir URLs de la API desde la variable de entorno
const RAW_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_URL ||
  "siged-production.up.railway.app/api";

export const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

export const apiUrl = (path = "") => {
  const cleanPath = String(path).replace(/^\/+/, "");
  return `${API_BASE}/${cleanPath}`;
};
