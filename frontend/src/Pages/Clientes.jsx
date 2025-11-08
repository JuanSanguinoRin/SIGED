"use client";
import { useEffect, useState } from "react";
import ClientCard from "../Components/ClientCard";
import ClientDetail from "../Components/ClientDetail";

import ClientSearchBar from "../Components/ClientSearchBar";
import EditClientModal from "../Components/EditClientModal";


const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalCliente, setModalCliente] = useState(null);

  // 🔹 Cargar lista general al montar
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

  // 🔹 Buscar clientes (por cédula o nombre)
  const handleBuscar = async (termino) => {
    if (!termino) {
      fetchClientes();
      return;
    }

    try {
      let url = "";
      if (/^\d+$/.test(termino)) {
        // Si es numérico → búsqueda por cédula
        url = `http://127.0.0.1:8000/api/terceros/clientes/buscar_por_cedula/?cedula=${termino}`;
      } else {
        // Si contiene letras → búsqueda por nombre
        url = `http://127.0.0.1:8000/api/terceros/clientes/buscar_por_nombre/?nombre=${termino}`;
      }

      const response = await fetch(url);

      if (response.status === 404) {
        // Si el backend devuelve 404 → sin resultados
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

  // 🔹 useEffect con debounce para búsqueda reactiva
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleBuscar(searchTerm);
    }, 400); // espera 400 ms después de dejar de escribir

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // 🔹 Mostrar u ocultar detalle del cliente (acordeón)
  const handleSelect = async (cliente) => {
    if (selectedClient?.id === cliente.id) {
      setSelectedClient(null);
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/terceros/clientes/${cliente.id}/`);
      if (!response.ok) throw new Error("Error al obtener detalle del cliente");
      const detalle = await response.json();
      setSelectedClient(detalle);
    } catch (err) {
      console.error("Error cargando detalle:", err);
    }
  };

   // 🔹 Abrir modal de edición
  const handleEdit = (cliente) => {
    setModalCliente(cliente);
  };

  // 🔹 Guardar cambios del cliente (tras editar)
  const handleSave = (clienteActualizado) => {
    setClientes((prevClientes) =>
      prevClientes.map((c) => (c.id === clienteActualizado.id ? clienteActualizado : c))
    );
  };

  const handleDelete = (id) => {
    console.log("Eliminar cliente con ID:", id);
  };

  if (loading) return <p className="text-center text-gray-500">Cargando clientes...</p>;
  if (error) return <p className="text-center text-red-500">Error: {error}</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Clientes</h2>

      {/* 🔍 Barra de búsqueda */}
      <ClientSearchBar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
      />

      {/* 🔹 Lista de clientes */}
      {clientes.length === 0 ? (
        <p className="text-center text-gray-500">No se encontraron clientes.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden transition-all duration-300"
            >
              <ClientCard
                cliente={cliente}
                isOpen={selectedClient?.id === cliente.id}
                onSelect={() => handleSelect(cliente)}
                onEdit={handleEdit}  
                onDelete={handleDelete}
              />

              {/* Detalle del cliente debajo del card */}
              {selectedClient?.id === cliente.id && (
                <div className="p-4 bg-white border-t border-gray-200 transition-all duration-500 ease-in-out">
                  <ClientDetail
                    cliente={selectedClient}
                    resumen={{ totalCompras: 2500000, cantidadCompras: 5 }}
                    historial={[
                      { id: 1, producto: "Anillo de Oro", fecha: "2025-09-20", monto: 350000 },
                      { id: 2, producto: "Pulsera de Plata", fecha: "2025-08-15", monto: 180000 },
                    ]}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🔹 Modal de edición */}
      {modalCliente && (
        <EditClientModal
          cliente={modalCliente}
          onClose={() => setModalCliente(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Clientes;
