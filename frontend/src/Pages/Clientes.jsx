"use client";
import { useEffect, useState } from "react";
import { apiUrl } from "../config/api";
import ClientCard from "../Components/ClientCard";
import ClientDetail from "../Components/ClientDetail";
import ClientSearchBar from "../Components/ClientSearchBar";
import ClientModal from "../Components/ClientModal";

// Función para formatear números al estándar español: 53.189,90
const formatNumber = (value, decimals = 2) => {
  if (!value && value !== 0) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalCliente, setModalCliente] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  // Unificamos el efecto de carga inicial y búsqueda para evitar doble carga
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleBuscar(searchTerm);
    }, 400);

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, mostrarArchivados]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        apiUrl(`terceros/clientes/?archivado=${mostrarArchivados}`)
      );
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
        url = apiUrl(`terceros/clientes/buscar_por_cedula/?cedula=${termino}`);
      } else {
        url = apiUrl(`terceros/clientes/buscar_por_nombre/?nombre=${termino}`);
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

  const handleSelect = async (clienteId) => {
    if (selectedClient?.id === clienteId) {
      setSelectedClient(null);
      return;
    }

    try {
      const [detalleRes, ventasRes] = await Promise.all([
        fetch(apiUrl(`terceros/clientes/${clienteId}/`)),
        fetch(apiUrl(`compra_venta/ventas/por-cliente-id/?cliente_id=${clienteId}`)),
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

  // Abrir modal para CREAR cliente
  const handleCreateClick = () => {
    setModalCliente({});
    setIsCreating(true);
  };

  // Abrir modal para EDITAR cliente
  const handleEdit = (cliente) => {
    setModalCliente(cliente);
    setIsCreating(false);
  };

  // Archivar / Desarchivar cliente
  const handleArchive = async (cliente) => {
    try {
      const endpoint = apiUrl(`terceros/clientes/${cliente.id}/${mostrarArchivados ? 'desarchivar' : 'archivar'
        }/`);

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
            ? 'Error al desarchivar cliente'
            : 'Error al archivar cliente'
        );
      }

      const data = await response.json();

      await fetchClientes();

      if (selectedClient?.id === cliente.id) {
        setSelectedClient(null);
      }

      alert(data.mensaje || 'Operación completada');
    } catch (err) {
      console.error('Error completo:', err);
      alert(
        mostrarArchivados
          ? 'No se pudo desarchivar el cliente'
          : 'No se pudo archivar el cliente'
      );
    }
  };

  // Guardar cliente (crear o actualizar)
  const handleSave = (clienteActualizado) => {
    if (isCreating) {
      setClientes((prev) => [...prev, clienteActualizado]);
    } else {
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
    <div className="p-6 max-w-6xl mx-auto relative">
      <div className="absolute right-4 top-6 flex gap-3">
        {!mostrarArchivados && (
          <button
            onClick={handleCreateClick}
            className="bg-white/70 backdrop-blur-sm border border-gray-200 px-3 py-2 rounded-lg shadow hover:shadow-md transition flex items-center gap-2"
            title="Crear cliente"
          >
            <span className="text-xl">+</span>
            Crear
          </button>
        )}

        <button
          onClick={() => setMostrarArchivados((s) => !s)}
          className="bg-white/70 backdrop-blur-sm border border-gray-200 px-3 py-2 rounded-lg shadow hover:shadow-md transition"
          title={mostrarArchivados ? "Ver clientes activos" : "Ver clientes archivados"}
        >
          {mostrarArchivados ? "Ver activos" : "Archivados"}
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Clientes</h1>

      <ClientSearchBar
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        placeholder={mostrarArchivados ? "Buscar clientes archivados..." : "Buscar cliente..."}
      />

      {clientes.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">
          {mostrarArchivados ? "No hay clientes archivados." : "No se encontraron clientes."}
        </p>
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
                onArchive={handleArchive}
                mostrarArchivados={mostrarArchivados}
              />

              {selectedClient?.id === cliente.id && (
                <div className="p-4 bg-white border-t border-gray-200 transition-all duration-500 ease-in-out">
                  <ClientDetail cliente={selectedClient} historial={selectedClient.historial} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal unificado para crear y editar */}
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