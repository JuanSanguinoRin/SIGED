"use client";
import { useEffect, useState } from "react";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaEdit,
  FaChevronDown,
  FaTimes,
  FaPlus,
} from "react-icons/fa";
import "./../css/Proveedores.css";

const Proveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarArchivados] = useState(false);
  const [modalProveedor, setModalProveedor] = useState(null);
  const [modalCrear, setModalCrear] = useState(false);

  // 🔹 Cargar proveedores (según si se muestran archivados o no)
  useEffect(() => {
    fetchProveedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarArchivados]);

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/terceros/proveedores/?archivado=${mostrarArchivados}`
      );
      if (!response.ok) throw new Error("Error al obtener proveedores");
      const data = await response.json();
      setProveedores(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Buscar por nombre (nota: el backend filtra por archivado en buscar_por_nombre)
  const handleBuscar = async (termino) => {
    if (!termino) {
      fetchProveedores();
      return;
    }
    try {
      const url = `http://127.0.0.1:8000/api/terceros/proveedores/buscar_por_nombre/?nombre=${termino}`;
      const response = await fetch(url);
      if (response.status === 404) {
        setProveedores([]);
        return;
      }
      if (!response.ok) throw new Error("Error al buscar proveedores");
      const data = await response.json();
      // Nota: buscar_por_nombre en backend devuelve sólo no archivados por defecto.
      setProveedores(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => handleBuscar(searchTerm), 400);
    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // 🔹 Obtener detalle + historial dinámico
  const handleSelect = async (proveedor) => {
    if (selectedProveedor?.id === proveedor.id) {
      setSelectedProveedor(null);
      return;
    }
    try {
      const [detalleRes, comprasRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/terceros/proveedores/${proveedor.id}/`),
        fetch(`http://127.0.0.1:8000/api/compra_venta/compras/`),
      ]);

      if (!detalleRes.ok) throw new Error("Error al obtener detalle del proveedor");
      if (!comprasRes.ok) throw new Error("Error al obtener compras");

      const detalle = await detalleRes.json();
      const compras = await comprasRes.json();
      const comprasProveedor = compras.filter((c) => c.proveedor === proveedor.id);

      setSelectedProveedor({ ...detalle, historial: comprasProveedor });
    } catch (err) {
      console.error(err);
      alert("Error cargando detalle/historial");
    }
  };

  const handleEdit = (proveedor) => setModalProveedor(proveedor);

  // 🔹 Archivar / Restaurar (usa endpoints diferentes)
  const handleArchive = async (proveedor) => {
    try {
      // Construir URL según si está archivando o desarchivando
      const endpoint = `http://127.0.0.1:8000/api/terceros/proveedores/${proveedor.id}/${
        mostrarArchivados ? 'desarchivar' : 'archivar'
      }/`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(
          mostrarArchivados
            ? 'Error al desarchivar proveedor'
            : 'Error al archivar proveedor'
        );
      }

      const data = await response.json();
      
      // Refresca la lista
      await fetchProveedores();
      
      // Cerrar detalle si estaba abierto
      if (selectedProveedor?.id === proveedor.id) {
        setSelectedProveedor(null);
      }

      alert(data.mensaje || 'Operación completada');
    } catch (err) {
      console.error('Error completo:', err);
      alert(
        mostrarArchivados
          ? 'No se pudo desarchivar el proveedor'
          : 'No se pudo archivar el proveedor'
      );
    }
  };

  const handleSave = (proveedorActualizado) => {
    setProveedores((prev) =>
      prev.map((p) => (p.id === proveedorActualizado.id ? proveedorActualizado : p))
    );
  };

  // 🔹 Crear proveedor (abre modal). submit en modal hace POST
  const handleCreate = async (formData) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/terceros/proveedores/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        console.error("Error creando proveedor:", err);
        throw new Error("Error al crear proveedor");
      }
      const created = await response.json();
      setModalCrear(false);
      // Si estamos viendo archivados, no recargamos (porque el nuevo es activo). Si estamos en activos, recargamos.
      if (!mostrarArchivados) {
        await fetchProveedores();
      }
      alert("✅ Proveedor creado correctamente");
    } catch (err) {
      console.error(err);
      alert("❌ No se pudo crear el proveedor");
    }
  };

  if (loading) return <p className="text-center text-gray-500">Cargando proveedores...</p>;
  if (error) return <p className="text-center text-red-500">Error: {error}</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto relative">
      {/* Botones de crear y archivados */}
      <div className="absolute right-4 top-6 flex gap-3">
        <button
          onClick={() => setModalCrear(true)}
          className="bg-white/70 backdrop-blur-sm border border-gray-200 px-3 py-2 rounded-lg shadow hover:shadow-md transition flex items-center gap-2"
          title="Crear proveedor"
        >
          <FaPlus /> Crear
        </button>

      </div>

      <h2 className="text-3xl font-bold mb-6 text-gray-800">Proveedores</h2>

      {/* Barra de búsqueda */}
      <div className="relative mb-6 w-full max-w-lg mx-auto">
        <input
          type="text"
          placeholder="Buscar proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-4 py-3 rounded-2xl bg-gray-200 shadow text-gray-900 placeholder-gray-500 outline-none border-none transition focus:bg-gray-300"
        />
      </div>

      {/* Lista */}
      {proveedores.length === 0 ? (
        <p className="text-center text-gray-500">
          {mostrarArchivados ? "No hay proveedores archivados." : "No se encontraron proveedores."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {proveedores.map((proveedor) => (
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
                      <FaPhone className="text-black text-xs" />
                      {proveedor.telefono || "Teléfono no registrado"}
                    </p>
                    <p className="flex items-center gap-2 md:ml-6">
                      <FaEnvelope className="text-black text-xs" />
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

                 

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(proveedor);
                    }}
                    className="text-gray-500"
                    title="Ver detalle"
                  >
                    <FaChevronDown
                      className={`w-6 h-6 transform transition-transform duration-300 ${
                        selectedProveedor?.id === proveedor.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Detalle con historial dinámico */}
              {selectedProveedor?.id === proveedor.id && (
                <div className="p-4 bg-white border-t border-gray-200 mt-3 transition-all duration-500 ease-in-out">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                    Detalles del Proveedor
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-gray-600 flex items-center gap-2">
                        <FaPhone className="text-purple-600" />
                        <span className="font-medium">Teléfono:</span>{" "}
                        {proveedor.telefono || "No registrado"}
                      </p>
                      <p className="text-gray-600 flex items-center gap-2 mt-2">
                        <FaEnvelope className="text-purple-600" />
                        <span className="font-medium">Correo:</span>{" "}
                        {proveedor.email || "No registrado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 flex items-center gap-2">
                        <FaMapMarkerAlt className="text-purple-600" />
                        <span className="font-medium">Dirección:</span>{" "}
                        {proveedor.direccion || "No registrada"}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Historial de Compras
                  </h3>

                  {selectedProveedor.historial?.length ? (
                    selectedProveedor.historial.map((compra) => (
                      <div key={compra.id} className="mb-5">
                        <p className="font-semibold text-gray-700">
                          {compra.descripcion} — {compra.fecha}
                        </p>
                        <table className="w-full border-collapse text-sm mt-2 mb-3">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="p-2 text-left">Prenda</th>
                              <th className="p-2 text-left">Gramos</th>
                              <th className="p-2 text-left">Cantidad</th>
                              <th className="p-2 text-left">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compra.prendas.map((p) => (
                              <tr key={p.id}>
                                <td className="p-2 border-t">{p.prenda_nombre}</td>
                                <td className="p-2 border-t">{p.prenda_gramos}</td>
                                <td className="p-2 border-t">{p.cantidad}</td>
                                <td className="p-2 border-t">${p.subtotal}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Sin registros de compras.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalProveedor && (
        <EditProveedorModal
          proveedor={modalProveedor}
          onClose={() => setModalProveedor(null)}
          onSave={(u) => {
            handleSave(u);
            setModalProveedor(null);
          }}
        />
      )}

      {modalCrear && (
        <CreateProveedorModal
          onClose={() => setModalCrear(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};

// 🟣 Modal de edición
const EditProveedorModal = ({ proveedor, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: proveedor.nombre || "",
    telefono: proveedor.telefono || "",
    direccion: proveedor.direccion || "",
    email: proveedor.email || "",
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/terceros/proveedores/${proveedor.id}/`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (!response.ok) throw new Error("Error al actualizar proveedor");
      const updated = await response.json();
      onSave(updated);
      onClose();
      alert("✅ Proveedor actualizado correctamente");
    } catch (error) {
      console.error("Error guardando cambios:", error);
      alert("❌ Error al guardar los cambios");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Editar Proveedor</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
            <FaTimes size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Teléfono</label>
            <input
              type="text"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Correo</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-700">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 🟣 Modal de creación (efecto desenfoque en backdrop)
const CreateProveedorModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    email: "",
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Crear Proveedor</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
            <FaTimes size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Nombre</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" required />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Teléfono</label>
            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Dirección</label>
            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Correo</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-700">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white">
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Proveedores;
