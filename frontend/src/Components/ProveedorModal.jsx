// src/Components/ProveedorModal.jsx
"use client";
import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { apiUrl } from "../config/api";

const ProveedorModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    email: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch(apiUrl("terceros/proveedores/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      alert("Error al crear proveedor");
      return;
    }

    const nuevo = await response.json();
    onSave(nuevo);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Crear Proveedor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            className="w-full border p-2 rounded"
            required
            value={formData.nombre}
            onChange={handleChange}
          />

          <input
            type="text"
            name="telefono"
            placeholder="Teléfono"
            className="w-full border p-2 rounded"
            value={formData.telefono}
            onChange={handleChange}
          />

          <input
            type="text"
            name="direccion"
            placeholder="Dirección"
            className="w-full border p-2 rounded"
            value={formData.direccion}
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Correo"
            className="w-full border p-2 rounded"
            value={formData.email}
            onChange={handleChange}
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProveedorModal;
