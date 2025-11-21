"use client";
import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function SmallSpinner() {
  return <div className="inline-block animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" />;
}

// Componente para el badge de estado
const EstadoBadge = ({ estado }) => {
  const getEstadoConfig = (estadoNombre) => {
    const nombre = String(estadoNombre || "").toLowerCase();
    if (nombre === "finalizado") return { color: "bg-gray-100 text-gray-700", text: "Finalizado" };
    if (nombre === "en proceso") return { color: "bg-green-100 text-green-700", text: "En Proceso" };
    if (nombre === "cancelado") return { color: "bg-red-100 text-red-700", text: "Cancelado" };
    if (nombre === "caducado") return { color: "bg-orange-100 text-orange-700", text: "Caducado" };
    return { color: "bg-gray-100 text-gray-500", text: estado || "—" };
  };

  const config = getEstadoConfig(estado);
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      {config.text}
    </span>
  );
};

const DeudasPagar = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [proveedoresConDeuda, setProveedoresConDeuda] = useState([]);

  const [abonoModal, setAbonoModal] = useState(null);
  const [metodosPago, setMetodosPago] = useState([]);
  const [openProveedorId, setOpenProveedorId] = useState(null);
  const [openDeudaId, setOpenDeudaId] = useState(null);
  
  // Estado para el filtro activo
  const [filtroEstado, setFiltroEstado] = useState("En Proceso");

  const getEstadoNombre = (estado) => {
    if (!estado) return "";
    if (typeof estado === "string") return estado;
    if (typeof estado === "object") return estado.nombre || "";
    
    // Si es un número (ID), convertirlo al nombre
    if (typeof estado === "number") {
      const estadosMap = {
        1: "Finalizado",
        3: "Cancelado",
        4: "En Proceso",
        5: "Caducado"
      };
      return estadosMap[estado] || "";
    }
    
    return "";
  };

  const fetchMetodosPago = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dominios_comunes/metodos-pago/`);
      if (!res.ok) throw new Error("Error al obtener métodos de pago");
      const data = await res.json();
      setMetodosPago(data);
    } catch (err) {
      console.error("Error cargando métodos de pago:", err);
    }
  };

const fetchAllProveedoresAndFilter = async () => {
  setLoading(true);
  setError(null);
  try {
    // ✅ UNA SOLA CONSULTA
    const res = await fetch(`${API_BASE}/api/apartado_credito/deudas-por-pagar-optimizado/`);
    if (!res.ok) throw new Error("Error al obtener deudas");
    const data = await res.json();

    // Filtrar por estado
    const filtrado = data
      .map((item) => {
        const deudasFiltradas = item.deudas.filter((d) => {
          const estadoNombre = getEstadoNombre(d.estado);
          return estadoNombre.toLowerCase() === filtroEstado.toLowerCase();
        });
        return { proveedor: item.proveedor, deudas: deudasFiltradas };
      })
      .filter((it) => it.deudas.length > 0);

    setProveedoresConDeuda(filtrado);
  } catch (err) {
    console.error(err);
    setError(err.message || String(err));
  } finally {
    setLoading(false);
  }
};

  const handleBuscar = async (termino) => {
    if (!termino) {
      fetchAllProveedoresAndFilter();
      return;
    }

    try {
      // Buscar proveedores por nombre
      const url = `${API_BASE}/api/terceros/proveedores/buscar_por_nombre/?nombre=${termino}`;

      const response = await fetch(url);
      if (response.status === 404) {
        setProveedoresConDeuda([]);
        return;
      }
      if (!response.ok) throw new Error("Error al buscar proveedores");

      const data = await response.json();
      const lista = Array.isArray(data) ? data : [data];

     
      const all = await Promise.all(prom);

      const filtrado = all
        .map((item) => {
          const deudasPendientes = item.deudas.filter((d) => {
            const estadoNombre = getEstadoNombre(d.estado);
            return estadoNombre.toLowerCase() === filtroEstado.toLowerCase();
          });
          return { proveedor: item.proveedor, deudas: deudasPendientes };
        })
        .filter((it) => it.deudas.length > 0);

      setProveedoresConDeuda(filtrado);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    }
  };

  

  const openAbonarModal = (proveedor, deuda) => {
    setAbonoModal({
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      deuda,
      monto: "",
      metodo_pago: "",
      submitting: false,
      error: null,
    });
  };

  const closeAbonarModal = () => setAbonoModal(null);

  const submitAbono = async () => {
    if (!abonoModal) return;
    const { deuda, monto } = abonoModal;
    const parsed = parseFloat(monto);
    if (!parsed || parsed <= 0) {
      setAbonoModal((s) => ({ ...s, error: "Ingrese un monto válido mayor a 0" }));
      return;
    }

    setAbonoModal((s) => ({ ...s, submitting: true, error: null }));

    const payload = {
      monto: parsed,
      fecha: new Date().toISOString().slice(0, 10),
      metodo_pago: parseInt(abonoModal.metodo_pago),
      credito: deuda.credito_id,
    };

    try {
      const res = await fetch(`${API_BASE}/api/apartado_credito/cuotas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg =
          (err && (err.warning || err.detail || JSON.stringify(err))) ||
          `Error ${res.status}`;
        throw new Error(msg);
      }

      // Obtener el detalle actualizado
      let detalleActualizado = null;
      const det = await fetch(
        `${API_BASE}/api/apartado_credito/creditos/${deuda.credito_id}/`
      );
      detalleActualizado = det.ok ? await det.json() : null;

      // Obtener cuotas actualizadas
      const cuotasRes = await fetch(
        `${API_BASE}/api/apartado_credito/cuotas/?credito=${deuda.credito_id}`
      );
      const cuotasActualizadas = cuotasRes.ok ? await cuotasRes.json() : [];

      // Actualizar el estado local
      setProveedoresConDeuda((prev) =>
        prev
          .map((item) => {
            if (item.proveedor.id !== abonoModal.proveedorId) return item;
            const nuevasDeudas = item.deudas.map((d) => {
              if (d.compra_id === deuda.compra_id && d.tipo === deuda.tipo) {
                const montoPendienteActual =
                  detalleActualizado?.monto_pendiente ??
                  (d.monto_pendiente != null ? Math.max(0, d.monto_pendiente - parsed) : null);

                // Obtener el estado actualizado del backend
                const estadoActualizado = getEstadoNombre(
                  detalleActualizado?.estado_detalle ||
                  detalleActualizado?.estado ||
                  d.estado
                );

                return {
                  ...d,
                  cuotas_pendientes:
                    detalleActualizado?.cuotas_pendientes ??
                    (d.cuotas_pendientes != null
                      ? Math.max(0, d.cuotas_pendientes - 1)
                      : null),
                  monto_pendiente: montoPendienteActual,
                  estado: estadoActualizado,
                  abonos: cuotasActualizadas,
                };
              }
              return d;
            });
            return { ...item, deudas: nuevasDeudas };
          })
          .map((item) => ({
            ...item,
            deudas: item.deudas.filter((d) => {
              const estadoNombre = getEstadoNombre(d.estado);
              return estadoNombre.toLowerCase() === filtroEstado.toLowerCase();
            }),
          }))
          .filter((item) => item.deudas.length > 0)
      );

      setAbonoModal((s) => ({ ...s, submitting: false }));
      closeAbonarModal();
    } catch (err) {
      console.error("Error al abonar:", err);
      setAbonoModal((s) => ({
        ...s,
        submitting: false,
        error: err.message || String(err),
      }));
    }
  };

  const handleCancelarDeuda = async (proveedor, deuda) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`¿Está seguro de cancelar esta deuda?\n\nTipo: ${deuda.tipo}\nCompra #${deuda.compra_id}\n\nEl dinero pagado no será reembolsable y el inventario será ajustado.`)) {
      return;
    }

    try {
      const url = `${API_BASE}/api/apartado_credito/creditos/${deuda.credito_id}/cancelar/`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const msg = (err && (err.error || err.detail || JSON.stringify(err))) || `Error ${res.status}`;
        throw new Error(msg);
      }

      const data = await res.json();
      
      // Actualizar la lista local eliminando la deuda cancelada
      setProveedoresConDeuda((prev) =>
        prev
          .map((item) => {
            if (item.proveedor.id !== proveedor.id) return item;
            
            const deudasActualizadas = item.deudas.filter(
              (d) => !(d.compra_id === deuda.compra_id && d.tipo === deuda.tipo)
            );
            
            return { ...item, deudas: deudasActualizadas };
          })
          .filter((item) => item.deudas.length > 0)
      );

      alert(data.message || "Deuda cancelada correctamente. El inventario ha sido ajustado.");
    } catch (err) {
      console.error("Error al cancelar deuda:", err);
      alert(`Error al cancelar la deuda: ${err.message}`);
    }
  };

  // useEffect para cargar datos iniciales
  useEffect(() => {
    fetchAllProveedoresAndFilter();
    fetchMetodosPago();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado]);

  // useEffect para el debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      handleBuscar(searchTerm);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filtroEstado]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 flex items-center justify-center gap-2">
          Cargando deudas por pagar... <SmallSpinner />
        </p>
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Proveedores - Deudas por Pagar
        </h1>
      </div>

      {/* Botones de filtro por estado */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setFiltroEstado("En Proceso")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filtroEstado === "En Proceso"
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          En Proceso
        </button>
        <button
          onClick={() => setFiltroEstado("Finalizado")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filtroEstado === "Finalizado"
              ? "bg-gray-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Finalizados
        </button>
        <button
          onClick={() => setFiltroEstado("Cancelado")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filtroEstado === "Cancelado"
              ? "bg-red-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Cancelados
        </button>
        <button
          onClick={() => setFiltroEstado("Caducado")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filtroEstado === "Caducado"
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Caducados
        </button>
      </div>

      <div className="mb-6">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre de proveedor..."
          className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {proveedoresConDeuda.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">
          No hay proveedores con deudas en estado: <span className="font-semibold">{filtroEstado}</span>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {proveedoresConDeuda.map(({ proveedor, deudas }) => (
            <div
              key={proveedor.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Header del proveedor */}
              <div
                className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() =>
                  setOpenProveedorId(openProveedorId === proveedor.id ? null : proveedor.id)
                }
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {proveedor.nombre}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Teléfono: {proveedor.telefono || "N/A"}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Deudas: <span className="font-semibold text-gray-700">{deudas.length}</span>
                    </p>
                  </div>
                  <div className="text-gray-500">
                    {openProveedorId === proveedor.id ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de deudas */}
              {openProveedorId === proveedor.id && (
                <div className="p-4 bg-white">
                  <div className="flex flex-col gap-3">
                    {deudas.map((deuda) => {
                      const deudaKey = `${deuda.compra_id}-${deuda.tipo}`;
                      const isDeudaOpen = openDeudaId === deudaKey;

                      return (
                        <div
                          key={deudaKey}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          {/* Header de la deuda */}
                          <div
                            className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() =>
                              setOpenDeudaId(isDeudaOpen ? null : deudaKey)
                            }
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">
                                {deuda.descripcion || `Compra #${deuda.compra_id}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                                {deuda.tipo}
                              </span>
                              <EstadoBadge estado={deuda.estado} />
                              <div className="text-gray-400">
                                {isDeudaOpen ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Detalle de la deuda */}
                          {isDeudaOpen && (
                            <div className="p-4 bg-white">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Columna izquierda */}
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                      Información General
                                    </h4>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Cuotas pendientes:</span>
                                      <span className="font-medium">
                                        {deuda.cuotas_pendientes ?? "—"} / {deuda.cantidad_cuotas ?? "—"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Fecha de compra:</span>
                                      <span className="font-medium">{deuda.compra?.fecha ?? "—"}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Fecha límite:</span>
                                      <span className="font-medium">{deuda.fecha_limite ?? "—"}</span>
                                    </div>
                                    {deuda.interes && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Interés:</span>
                                        <span className="font-medium">{deuda.interes}%</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Prendas incluidas */}
                                  {deuda.compra?.prendas && deuda.compra.prendas.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                        Prendas incluidas
                                      </h4>
                                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Prenda</th>
                                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Cant.</th>
                                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Subtotal</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                            {deuda.compra.prendas.map((prenda, idx) => (
                                              <tr key={idx} className="bg-white">
                                                <td className="px-3 py-2 text-gray-700">
                                                  {prenda.prenda_nombre}
                                                </td>
                                                <td className="px-3 py-2 text-right text-gray-600">
                                                  {prenda.cantidad}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-700">
                                                  ${parseFloat(prenda.subtotal || 0).toLocaleString()}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Columna derecha - Montos */}
                                <div className="space-y-4">
                                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                      Resumen de Montos
                                    </h4>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Monto total:</span>
                                      <span className="font-semibold text-gray-800">
                                        ${parseFloat(deuda.total || 0).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Monto pagado:</span>
                                      <span className="font-medium text-green-600">
                                        ${(parseFloat(deuda.total || 0) - parseFloat(deuda.monto_pendiente || 0)).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="border-t border-gray-300 pt-2 flex justify-between text-base">
                                      <span className="font-semibold text-gray-700">Monto por pagar:</span>
                                      <span className="font-bold text-red-600">
                                        ${parseFloat(deuda.monto_pendiente || 0).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Abonos realizados */}
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                      Historial de Abonos
                                    </h4>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                      {deuda.abonos && deuda.abonos.length > 0 ? (
                                        <table className="w-full text-sm">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Fecha</th>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Método</th>
                                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Monto</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200">
                                            {deuda.abonos.map((abono) => (
                                              <tr key={abono.id} className="bg-white hover:bg-gray-50">
                                                <td className="px-3 py-2 text-gray-700">
                                                  {new Date(abono.fecha).toLocaleDateString('es-CO')}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">
                                                  {abono.metodo_pago_nombre || "—"}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-green-600">
                                                  ${parseFloat(abono.monto || 0).toLocaleString()}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot className="bg-gray-50">
                                            <tr>
                                              <td colSpan="2" className="px-3 py-2 text-sm font-semibold text-gray-700">
                                                Total Abonado:
                                              </td>
                                              <td className="px-3 py-2 text-right text-sm font-bold text-green-700">
                                                ${deuda.abonos
                                                  .reduce((sum, a) => sum + parseFloat(a.monto || 0), 0)
                                                  .toLocaleString()}
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      ) : (
                                        <div className="p-3 text-center">
                                          <p className="text-xs text-gray-500">
                                            No hay abonos registrados aún
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Botones de acción */}
                              <div className="mt-6 flex gap-3 justify-end border-t border-gray-200 pt-4">
                                <button
                                  onClick={() => handleCancelarDeuda(proveedor, deuda)}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  Cancelar Deuda
                                </button>
                                <button
                                  onClick={() => openAbonarModal(proveedor, deuda)}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  Abonar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Abono */}
      {abonoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Abonar - {abonoModal.proveedorNombre}
              </h2>
              <button
                onClick={closeAbonarModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm text-gray-600">
                Deuda:{" "}
                <span className="font-medium text-gray-800">
                  {abonoModal.deuda.tipo} — Compra #{abonoModal.deuda.compra_id}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Estado actual:{" "}
                <span className="font-medium text-gray-800">
                  {abonoModal.deuda.estado}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Monto pendiente:{" "}
                <span className="font-semibold text-red-600">
                  ${parseFloat(abonoModal.deuda.monto_pendiente || 0).toLocaleString()}
                </span>
              </p>
            </div>

            <label className="block mb-2 text-sm font-medium text-gray-700">
              Monto a abonar
            </label>
            <input
              type="number"
              step="0.01"
              value={abonoModal.monto}
              onChange={(e) =>
                setAbonoModal((s) => ({ ...s, monto: e.target.value }))
              }
              placeholder="Ingrese el monto"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <label className="block mb-2 text-sm font-medium text-gray-700">
              Método de Pago
            </label>
            <select
              value={abonoModal.metodo_pago}
              onChange={(e) =>
                setAbonoModal((s) => ({ ...s, metodo_pago: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccione un método...</option>
              {metodosPago.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>

            {abonoModal.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{abonoModal.error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeAbonarModal}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                disabled={abonoModal.submitting}
              >
                Cancelar
              </button>
              <button
                onClick={submitAbono}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={abonoModal.submitting}
              >
                {abonoModal.submitting && <SmallSpinner />}
                Confirmar abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeudasPagar;