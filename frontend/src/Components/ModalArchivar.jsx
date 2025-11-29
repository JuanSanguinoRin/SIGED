import React from "react";
import "../css/Modal.css";
import { MdArchive } from "react-icons/md";

//VENTANA EMERGENTE PARA CUANDO SE QUIERA ARCHIVAR ALGUNA PRENDA QUE NO ESTE A LA VENTA 

export default function ModalArchivar({ prenda, onClose, onArchived }) {
  const handleArchive = async () => {
    const response = await fetch(`http://127.0.0.1:8000/api/prendas/prendas/${prenda.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivado: true }),
    });

    if (response.ok) {
      onArchived();
      onClose();
    } else {
      alert("Error al archivar la prenda");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-contenido modal-small">
        <h2>
          <MdArchive size={24} />
          Archivar Prenda
        </h2>
        <p>¿Deseas archivar "<strong>{prenda.nombre}</strong>"?</p>

        <div className="modal-botones">
          <button className="btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-guardar" onClick={handleArchive}>
            Archivar
          </button>
        </div>
      </div>
    </div>
  );
}