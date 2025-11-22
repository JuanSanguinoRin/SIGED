"use client";
import { useEffect, useState } from "react";
import { apiUrl } from "../config/api";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaTimes,
} from "react-icons/fa";
import "./../css/Proveedores.css";

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalProveedor, setModalProveedor] = useState(null);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);

  const isArchived = (p) =>
    p?.archivado === true || p?.archived === true || p?.activo === false || p?.active === false;

  useEffect(() => {
    fetchProveedores();
  }, [mostrarArchivados]);

  const fetchProveedores = async () => {
    try {
      const url = mostrarArchivados
        ? apiUrl("/terceros/proveedores/?archivado=true")
        : apiUrl("/terceros/proveedores/?archivado=false");
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al obtener proveedores");
      const data = await response.json();
      setProveedores(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async (termino) => {
    if (!termino) {
      fetchProveedores();
      return;
    }
    try {
      const url = apiUrl(`/terceros/proveedores/buscar_por_nombre/?nombre=${termino}`);
      const response = await fetch(url);
      if (response.status === 404) {
        setProveedores([]);
        return;
      }
      if (!response.ok) throw new Error("Error al buscar proveedores");
      const data = await response.json();
      setProveedores(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => handleBuscar(searchTerm), 400);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const handleSelect = async (proveedor) => {
    if (selectedProveedor?.id === proveedor.id) {
      setSelectedProveedor(null);
      return;
    }
    try {
      const response = await fetch(apiUrl(`/terceros/proveedores/${proveedor.id}/`));
      if (!response.ok) throw new Error("Error al obtener detalle del proveedor");
      const detalle = await response.json();
      setSelectedProveedor(detalle);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (proveedor) => setModalProveedor(proveedor);

  const handleArchive = async (id, archive = true) => {
    try {
      const endpoint = apiUrl(`/terceros/proveedores/${id}/${archive ? "archivar" : "desarchivar"}/`);
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        console.error("Error response:", errBody);
        throw new Error("Error al actualizar estado de archivado");
      }

      const updated = await response.json();
      setProveedores((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      if (archive && selectedProveedor?.id === id) setSelectedProveedor(null);
    } catch (err) {
      console.error("Error al archivar/desarchivar:", err);
      alert("Error al actualizar el estado del proveedor.");
    }
  };

  const handleSave = (proveedorActualizado) => {
    setProveedores((prev) =>
      prev.map((p) => (p.id === proveedorActualizado.id ? proveedorActualizado : p))
    );
  };

  const handleCreate = async (formData) => {
    try {
      const response = await fetch(apiUrl("/terceros/proveedores/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Error al crear proveedor");
      const nuevo = await response.json();
      setProveedores((prev) => [nuevo, ...prev]);
      setModalCrear(false);
    } catch (err) {
      console.error(err);
      alert("Error creando proveedor");
    }
  };

  if (loading) return <p className="text-center text-gray-500">Cargando proveedores...</p>;
  if (error) return <p className="text-center text-red-500">Error: {error}</p>;

  const visibleProveedores = proveedores.filter((p) => (mostrarArchivados ? isArchived(p) : !isArchived(p)));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Proveedores</h2>
        <div>
          <button
            onClick={() => setMostrarArchivados((s) => !s)}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            {mostrarArchivados ? "Ver activos" : "Archivados"}
          </button>
        </div>
      </div>

      <div className="relative mb-6 w-full max-w-lg mx-auto">
        <input
          type="text"
          placeholder={mostrarArchivados ? "Buscar proveedores archivados..." : "Buscar proveedor..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-4 py-3 rounded-2xl bg-gray-200 shadow text-gray-900 placeholder-gray-500 outline-none border-none transition focus:bg-gray-300"
        />
      </div>

      {visibleProveedores.length === 0 ? (
        <p className="text-center text-gray-500">
          {mostrarArchivados ? "No hay proveedores archivados." : "No se encontraron proveedores."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {visibleProveedores.map((proveedor) => (
            <div
              key={proveedor.id}
              className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition cursor-pointer p-4"
              onClick={() => handleSelect(proveedor)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{proveedor.nombre}</h2>
                  <div className="flex flex-col md:flex-row md:items-center text-gray-700 mt-2 text-sm gap-2">
                    <p className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 border border-black rounded-full">
                        <FaPhone className="text-black text-xs" />
                      </span>
                      {proveedor.telefono || "Teléfono no registrado"}
                    </p>

                    <p className="flex items-center gap-2 md:ml-6">
                      <span className="flex items-center justify-center w-6 h-6 border border-black rounded-full">
                        <FaEnvelope className="text-black text-xs" />
                      </span>
                      {proveedor.email || "Correo no registrado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(proveedor);
                    }}
                    className="text-blue-500 hover:text-blue-700 transition"
                    title="Editar proveedor"
                  >
                    <FaEdit size={18} />
                  </button>

                  {!mostrarArchivados ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(proveedor.id, true);
                      }}
                      className="text-red-500 hover:text-red-700 transition"
                      title="Archivar proveedor"
                    >
                      <FaTrash size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(proveedor.id, false);
                      }}
                      className="text-green-600 hover:text-green-800 transition"
                      title="Restaurar proveedor"
                    >
                      <FaTimes size={18} />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(proveedor);
                    }}
                    className="text-gray-500"
                  >
                    <FaChevronDown
                      className={`w-6 h-6 transform transition-transform duration-300 ${
                        selectedProveedor?.id === proveedor.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {selectedProveedor?.id === proveedor.id && (
                <div className="p-4 bg-white border-t border-gray-200 mt-3">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4">Detalles del Proveedor</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-gray-600 flex items-center gap-2">
                        <FaPhone className="text-purple-600" />
                        <span className="font-medium">Teléfono:</span> {proveedor.telefono || "No registrado"}
                      </p>
                      <p className="text-gray-600 flex items-center gap-2 mt-2">
                        <FaEnvelope className="text-purple-600" />
                        <span className="font-medium">Correo:</span> {proveedor.email || "No registrado"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600 flex items-center gap-2">
                        <FaMapMarkerAlt className="text-purple-600" />
                        <span className="font-medium">Dirección:</span> {proveedor.direccion || "No registrada"}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Resumen de Ventas</h3>
                  <div className="bg-purple-100 text-gray-700 rounded-xl p-4 mb-4">
                    <p>
                      <strong>Total en Ventas:</strong> $1.170.000
                    </p>
                    <p>
                      <strong>Órdenes Realizadas:</strong> 2
                    </p>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Historial de Compras</h3>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-left">Fecha</th>
                        <th className="p-2 text-left">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border-t">Anillo de Oro</td>
                        <td className="p-2 border-t">2025-09-15</td>
                        <td className="p-2 border-t">$850.000</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-t">Cadena de Oro</td>
                        <td className="p-2 border-t">2025-06-03</td>
                        <td className="p-2 border-t">$320.000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {modalProveedor && (
        // Aquí se espera el modal de edición del proveedor existente
        <div />
      )}
    </div>
  );
};

export default Proveedores;
