import React from "react";
import {
  FaPhone,
  FaEnvelope,
  FaEdit,
  FaTrash,
  FaChevronDown,
} from "react-icons/fa";

const ClientCard = ({ cliente, onEdit, onDelete, onSelect, isOpen }) => {

  return (
    <div
    className="w-full bg-white shadow-md rounded-xl p-4 mb-4 border border-gray-200 hover:shadow-lg transition cursor-pointer"
    onClick={() => onSelect(cliente.id)}
    
    >
      <div className="flex justify-between items-center">
        {/* Información del cliente */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {cliente?.nombre || "Cliente sin nombre"}
          </h2>

          <div className="flex flex-col md:flex-row md:items-center text-gray-700 mt-2 text-sm gap-2">
            <p className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 border border-black rounded-full">
                <FaPhone className="text-black text-xs" />
                </span>
                {cliente?.telefono || "Teléfono no registrado"}
            </p>

            <p className="flex items-center gap-2 md:ml-6">
                <span className="flex items-center justify-center w-6 h-6 border border-black rounded-full">
                <FaEnvelope className="text-black text-xs" />
                </span>
                {cliente?.email || "Correo no registrado"}
            </p>
            </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cliente);
            }}
            className="text-blue-500 hover:text-blue-700 transition"
            title="Editar cliente"
          >
            <FaEdit size={18} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cliente.id);
            }}
            className="text-red-500 hover:text-red-700 transition"
            title="Eliminar cliente"
          >
            <FaTrash size={18} />
          </button>

          <button
            onClick={(e) => {
            e.stopPropagation();
            onSelect(cliente.id);
            }}
            className="text-gray-500"
          >
            <FaChevronDown
                className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
      </div>
    </div>
    </div>
  );
};

export default ClientCard;
