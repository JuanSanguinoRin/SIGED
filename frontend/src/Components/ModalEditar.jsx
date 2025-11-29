import React, { useState } from "react";
import "../css/ModalEditar.css";

export default function ModalEditar({ prenda, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: prenda.nombre,
    gramos: prenda.gramos,
    es_chatarra: prenda.es_chatarra,
    es_recuperable: prenda.es_recuperable,
  });

  const handleSave = async () => {
    const response = await fetch(
      `http://127.0.0.1:8000/api/prendas/prendas/${prenda.id}/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );

    if (response.ok) {
      onSaved();
      onClose();
    } else {
      alert("❌ Error al actualizar la prenda");
    }
  };

  return (
    <div className="modalEditar-overlay">
      <div className="modalEditar-contenido animate">
        <h2 className="modalEditar-titulo">Editar Prenda</h2>

        {/* Nombre */}
        <label className="modalEditar-label">Nombre</label>
        <input
          className="modalEditar-input"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />

        {/* Gramos */}
        <label className="modalEditar-label">Gramos</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="modalEditar-input"
          value={form.gramos}
          onChange={(e) =>
            setForm({ ...form, gramos: e.target.value })
          }
        />

        {/* Switches */}
        <div className="modalEditar-switch-group">
          <label className="switch">
            <input
              type="checkbox"
              checked={form.es_chatarra}
              onChange={(e) =>
                setForm({ ...form, es_chatarra: e.target.checked })
              }
            />
            <span className="slider"></span>
            <span>Chatarra</span>
          </label>

          <label className="switch">
            <input
              type="checkbox"
              checked={form.es_recuperable}
              onChange={(e) =>
                setForm({ ...form, es_recuperable: e.target.checked })
              }
            />
            <span className="slider"></span>
            <span>Recuperable</span>
          </label>
        </div>

        <div className="modalEditar-botones">
          <button className="btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-guardar" onClick={handleSave}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
