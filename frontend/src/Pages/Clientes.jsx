"use client";
import { useEffect, useState } from "react";
import ClientCard from "../Components/ClientCard";
import ClientDetail from "../Components/ClientDetail";
import ClientSearchBar from "../Components/ClientSearchBar";
import ClientModal from "../Components/ClientModal"; // Renombrado y unificado


const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalCliente, setModalCliente] = useState(null);
  const [isCreating, setIsCreating] = useState(false); // 🔹 Nuevo: controlar modo


  useEffect(() => {
    fetchClientes();
  }, []);


  const fetchClientes = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/terceros/clientes/");
      if (!response.ok) throw new Error("Error al obtener clientes");
      const data = await response.json();
      setClientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleBuscar = async (termino) => {
    if (!termino) {
      fetchClientes();
      return;
    }

    try {
      let url = "";
      if (/^\d+$/.test(termino)) {
        url = `http://127.0.0.1:8000/api/terceros/clientes/buscar_por_cedula/?cedula=${termino}`;
      } else {
        url = `http://127.0.0.1:8000/api/terceros/clientes/buscar_por_nombre/?nombre=${termino}`;
      }

      const response = await fetch(url);

      if (response.status === 404) {
        setClientes([]);
        return;
      }

      if (!response.ok) throw new Error("Error al buscar clientes");

      const data = await response.json();
      setClientes(Array.isArray(data) ? data : [data]);
    } catch (error) {
      console.error("Error en búsqueda:", error);
      setError(error.message);
    }
  };


  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleBuscar(searchTerm);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);


  const handleSelect = async (clienteId) => {
    if (selectedClient?.id === clienteId) {
      setSelectedClient(null);
      return;
    }

    try {
      const [detalleRes, ventasRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/terceros/clientes/${clienteId}/`),
        fetch(`http://127.0.0.1:8000/api/compra_venta/ventas/`),
      ]);

      if (!detalleRes.ok) throw new Error("Error al obtener detalle del cliente");
      if (!ventasRes.ok) throw new Error("Error al obtener ventas");

      const detalle = await detalleRes.json();
      const ventas = await ventasRes.json();

      const ventasCliente = ventas.filter((v) => v.cliente === clienteId);

      setSelectedClient({
        ...detalle,
        historial: ventasCliente,
      });
    } catch (err) {
      console.error(err);
      alert("Error cargando detalle/historial");
    }
  };


  // 🔹 Abrir modal para CREAR cliente
  const handleCreateClick = () => {
    setModalCliente({});
    setIsCreating(true);
  };


  // 🔹 Abrir modal para EDITAR cliente
  const handleEdit = (cliente) => {
    setModalCliente(cliente);
    setIsCreating(false);
  };


  // 🔹 Guardar cliente (crear o actualizar)
  const handleSave = (clienteActualizado) => {
    if (isCreating) {
      // Crear nuevo cliente
      setClientes((prev) => [...prev, clienteActualizado]);
    } else {
      // Actualizar cliente existente
      setClientes((prev) =>
        prev.map((c) => (c.id === clienteActualizado.id ? clienteActualizado : c))
      );
    }
    setModalCliente(null);
    setIsCreating(false);
  };


  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Cargando clientes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
        <button
          onClick={handleCreateClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Crear Cliente
        </button>
      </div>
      
      <ClientSearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />

      {clientes.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No se encontraron clientes.</p>
      ) : (
        <div className="flex flex-col gap-4 mt-6">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden transition-all duration-300"
            >
              <ClientCard
                cliente={cliente}
                isOpen={selectedClient?.id === cliente.id}
                onSelect={handleSelect}
                onEdit={handleEdit}
              />

              {selectedClient?.id === cliente.id && (
                <div className="p-4 bg-white border-t border-gray-200 transition-all duration-500 ease-in-out">
                  <ClientDetail
                    cliente={selectedClient}
                    historial={selectedClient.historial}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🔹 Modal unificado para crear y editar */}
      {modalCliente && (
        <ClientModal
          cliente={modalCliente}
          isCreating={isCreating}
          onClose={() => {
            setModalCliente(null);
            setIsCreating(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Clientes;
