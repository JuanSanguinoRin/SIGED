import React, { useState } from "react";
import "../css/Login.css";
import { apiUrl } from "../config/api";



function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const response = await fetch(apiUrl("/auth/login/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // importante para mantener la sesión
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      window.location.href = "/admin";
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Error al iniciar sesión");
    }
  };

  return (
  <div className="login-container">
    <div className="login-card">
      <h1>Joyería Dubái</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Usuario"
          className="login-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="login-button">
          Iniciar Sesión
        </button>
      </form>
    </div>
  </div>
);
}

export default Login;
