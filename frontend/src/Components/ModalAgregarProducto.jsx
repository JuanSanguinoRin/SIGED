import React, { useState, useEffect } from "react";
import "../css/Modal.css";

export default function ModalAgregarProducto({ onClose, onAdd }) {
  const [nombre, setNombre] = useState("");
  const [tipoPrenda, setTipoPrenda] = useState("");
  const [tiposPrenda, setTiposPrenda] = useState([]);
  const [tipoOro, setTipoOro] = useState("");
  const [esChatarra, setEsChatarra] = useState(false);
  const [esRecuperable, setEsRecuperable] = useState(false);
  const [gramos, setGramos] = useState("");
  const [existencia, setExistencia] = useState(1);
  const [nuevoTipo, setNuevoTipo] = useState("");

  // 🔹 Cargar tipos de prenda
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/prendas/tipos-prenda/")
      .then((res) => res.json())
      .then((data) => setTiposPrenda(data))
      .catch((err) => console.error("Error cargando tipos:", err));
  }, []);

  // 🔹 Crear nueva prenda
  const handleGuardar = async (e) => {
    e.preventDefault();
    const data = {
      nombre,
      tipo_prenda: tipoPrenda,
      tipo_oro: tipoOro,
      es_chatarra: esChatarra,
      es_recuperable: esRecuperable,
      gramos,
      existencia,
      archivado: false,
    };

    const res = await fetch("http://127.0.0.1:8000/api/prendas/prendas/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      onAdd();
      onClose();
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || "No se pudo guardar"));
    }
  };

  // 🔹 Crear nuevo tipo de prenda
  const handleCrearTipo = async () => {
    if (!nuevoTipo.trim()) return alert("Ingrese un nombre válido");
    const res = await fetch("http://127.0.0.1:8000/api/prendas/tipos-prenda/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevoTipo }),
    });
    if (res.ok) {
      const nuevo = await res.json();
      setTiposPrenda([...tiposPrenda, nuevo]);
      setTipoPrenda(nuevo.id);
      setNuevoTipo("");
    } else {
      alert("Error al crear tipo de prenda");
    }
  };

   return (
    <div className="modal-overlay">
      <div className="modal-contenido">
        <h2>➕ Añadir Producto</h2>
        <form onSubmit={handleGuardar} className="form-producto">
          <input
            type="text"
            placeholder="Nombre del producto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          {/* 🟣 Tipo de prenda */}
          <div className="campo-grupo">
            <label>Tipo de prenda</label>
            <select
              className="select-prenda"
              value={tipoPrenda}
              onChange={(e) => setTipoPrenda(e.target.value)}
              required
            >
              <option value="">Seleccionar tipo de prenda</option>
              {tiposPrenda.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.nombre}
                </option>
              ))}
            </select>

            <div className="nuevo-tipo-grupo">
              <input
                type="text"
                placeholder="Nuevo tipo de prenda"
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value)}
              />
              <button
                type="button"
                className="btn-agregar"
                onClick={handleCrearTipo}
                title="Agregar nuevo tipo de prenda"
              >
                +
              </button>
            </div>
          </div>

          {/* 💎 Tipo de oro */}
          <div className="campo-grupo">
            <label>Tipo de oro</label>
            <select
              className={`select-oro ${
                tipoOro === "1"
                  ? "oro-nacional"
                  : tipoOro === "2"
                  ? "oro-italiano"
                  : ""
              }`}
              value={tipoOro}
              onChange={(e) => setTipoOro(e.target.value)}
              required
            >
              <option value="">Seleccionar tipo de oro</option>
              <option value="1">NACIONAL</option>
              <option value="2">ITALIANO</option>
            </select>
          </div>

          {/* 🟩 Booleans */}
          <div className="check-grupo">
            <label className="check-label gris">
              <input
                type="checkbox"
                checked={esChatarra}
                onChange={() => setEsChatarra(!esChatarra)}
              />
              Chatarra
            </label>
            <label className="check-label verde">
              <input
                type="checkbox"
                checked={esRecuperable}
                onChange={() => setEsRecuperable(!esRecuperable)}
              />
              Recuperable
            </label>
          </div>

          <input
            type="number"
            placeholder="Peso en gramos"
            step="0.01"
            value={gramos}
            onChange={(e) => setGramos(e.target.value)}
            required
          />

          <input
            type="number"
            placeholder="Cantidad existente"
            value={existencia}
            onChange={(e) => setExistencia(e.target.value)}
            required
          />

          <div className="modal-botones espaciar">
            <button type="button" className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}