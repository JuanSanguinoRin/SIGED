import React, { useEffect, useState } from "react";
import "../css/Modal.css";

export default function ModalArchivados({ onClose, onRefresh }) {
  const [archivados, setArchivados] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/prendas/prendas/")
      .then((res) => res.json())
      .then((data) => setArchivados(data.filter((p) => p.archivado)))
      .catch((err) => console.error("Error cargando archivados:", err));
  }, []);

  const handleDesarchivar = async (id) => {
    const res = await fetch(`http://127.0.0.1:8000/api/prendas/prendas/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivado: false }),
    });

    if (res.ok) {
      setArchivados(archivados.filter((p) => p.id !== id));
      onRefresh();
    } else {
      alert("Error al desarchivar");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contenido" style={{ width: "700px" }}>
        <h2>📦 Productos Archivados</h2>
        <table className="inventario-tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Material</th>
              <th>Gramos</th>
              <th>Existencia</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {archivados.length > 0 ? (
              archivados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td>{p.tipo_prenda_nombre}</td>
                  <td>{p.tipo_oro_nombre}</td>
                  <td>{p.gramos}</td>
                  <td>{p.existencia}</td>
                  <td>
                    <button
                      onClick={() => handleDesarchivar(p.id)}
                      className="btn-guardar"
                    >
                      Desarchivar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No hay productos archivados.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="modal-botones">
          <button className="btn-cancelar" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
