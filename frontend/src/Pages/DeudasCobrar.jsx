// DeudasCobrar.jsx
"use client";
import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function SmallSpinner() {
  return <div className="inline-block animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" />;
}

const DeudasCobrar = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [clientesConDeuda, setClientesConDeuda] = useState([]);

  const [abonoModal, setAbonoModal] = useState(null);
  const [metodosPago, setMetodosPago] = useState([]);
  const [openClientId, setOpenClientId] = useState(null);

  useEffect(() => {
    fetchAllClientesAndFilter();
    fetchMetodosPago();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      handleBuscar(searchTerm);
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const getEstadoNombre = (estado) => {
  if (!estado) return "";

  // si ya es string
  if (typeof estado === "string") return estado;

  // si es objeto (como tu JSON)
  if (typeof estado === "object") {
    return estado.nombre || "";
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

  const fetchAllClientesAndFilter = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/terceros/clientes/`);
      if (!res.ok) throw new Error("Error al obtener clientes");
      const data = await res.json();
      setClientes(data);

      const promClients = data.map(async (c) => {
        const deudas = await obtenerDeudasPorCliente(c.id);
        return { cliente: c, deudas };
      });

      const all = await Promise.all(promClients);
      const filtrado = all
        .map((item) => {
          const deudasPendientes = item.deudas.filter((d) => {
            const estadoNombre = getEstadoNombre(d.estado);
            return estadoNombre.toLowerCase() !== "finalizado";
          });
          return { cliente: item.cliente, deudas: deudasPendientes };
        })
        .filter((it) => it.deudas.length > 0);

      setClientesConDeuda(filtrado);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async (termino) => {
    if (!termino) {
      fetchAllClientesAndFilter();
      return;
    }

    try {
      let url = "";
      if (/^\d+$/.test(termino)) {
        url = `${API_BASE}/api/terceros/clientes/buscar_por_cedula/?cedula=${termino}`;
      } else {
        url = `${API_BASE}/api/terceros/clientes/buscar_por_nombre/?nombre=${termino}`;
      }

      const response = await fetch(url);
      if (response.status === 404) {
        setClientes([]);
        setClientesConDeuda([]);
        return;
      }
      if (!response.ok) throw new Error("Error al buscar clientes");

      const data = await response.json();
      const lista = Array.isArray(data) ? data : [data];
      setClientes(lista);

      const prom = lista.map(async (c) => ({
        cliente: c,
        deudas: await obtenerDeudasPorCliente(c.id),
      }));
      const all = await Promise.all(prom);

      const filtrado = all
        .map((item) => {
          const deudasPendientes = item.deudas.filter((d) => {
            const estadoNombre = getEstadoNombre(d.estado);
            return estadoNombre.toLowerCase() !== "finalizado";
          });
          return { cliente: item.cliente, deudas: deudasPendientes };
        })
        .filter((it) => it.deudas.length > 0);

      setClientesConDeuda(filtrado);
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    }
  };

  const obtenerDeudasPorCliente = async (clienteId) => {
    try {
      const ventasRes = await fetch(
        `${API_BASE}/api/compra_venta/ventas/por-cliente-id/?cliente_id=${clienteId}`
      );
      if (!ventasRes.ok) return [];
      const ventas = await ventasRes.json();

      const deudasArr = await Promise.all(
        ventas.map(async (v) => {
          if (v.credito) {
            const creditoId = typeof v.credito === "object" ? v.credito.id : v.credito;
            try {
              const det = await fetch(
                `${API_BASE}/api/apartado_credito/creditos/${creditoId}/`
              );
              if (!det.ok) throw new Error("no detalle credito");
              const crédito = await det.json();
              return {
                venta_id: v.id,
                tipo: "Crédito",
                total: v.total,
                cuotas_pendientes: crédito.cuotas_pendientes,
                fecha_limite: crédito.fecha_limite,
                estado:
                  crédito.estado_detalle ||
                  crédito.estado ||
                  String(crédito.estado_nombre || ""),
                credito_id: crédito.id,
                monto_pendiente: crédito.monto_pendiente ?? null,
              };
            } catch (e) {
              return {
                venta_id: v.id,
                tipo: "Crédito",
                total: v.total,
                cuotas_pendientes: v.credito?.cuotas_pendientes ?? null,
                fecha_limite: v.credito?.fecha_limite ?? null,
                estado: v.credito?.estado || null,
                credito_id: creditoId,
                monto_pendiente: v.credito?.monto_pendiente ?? null,
              };
            }
          } else if (v.apartado) {
            const apartadoId = typeof v.apartado === "object" ? v.apartado.id : v.apartado;
            try {
              const det = await fetch(
                `${API_BASE}/api/apartado_credito/apartados/${apartadoId}/`
              );
              if (!det.ok) throw new Error("no detalle apartado");
              const apartado = await det.json();
              return {
                venta_id: v.id,
                tipo: "Apartado",
                total: v.total,
                cuotas_pendientes: apartado.cuotas_pendientes,
                fecha_limite: apartado.fecha_limite,
                estado:
                  apartado.estado_detalle ||
                  apartado.estado ||
                  String(apartado.estado_nombre || ""),
                apartado_id: apartado.id,
                monto_pendiente: apartado.monto_pendiente ?? null,
              };
            } catch (e) {
              return {
                venta_id: v.id,
                tipo: "Apartado",
                total: v.total,
                cuotas_pendientes: v.apartado?.cuotas_pendientes ?? null,
                fecha_limite: v.apartado?.fecha_limite ?? null,
                estado: v.apartado?.estado ?? null,
                apartado_id: apartadoId,
                monto_pendiente: v.apartado?.monto_pendiente ?? null,
              };
            }
          } else {
            return null;
          }
        })
      );

      return deudasArr.filter(Boolean);
    } catch (err) {
      console.error("Error obtenerDeudasPorCliente:", err);
      return [];
    }
  };

  const openAbonarModal = (cliente, deuda) => {
    setAbonoModal({
      clienteId: cliente.id,
      clienteNombre:
        cliente.nombre ||
        cliente.razon_social ||
        `${cliente.nombres || ""} ${cliente.apellidos || ""}`.trim(),
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
    };

    if (deuda.credito_id) payload.credito = deuda.credito_id;
    if (deuda.apartado_id) payload.apartado = deuda.apartado_id;

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

      let detalleActualizado = null;
      if (deuda.credito_id) {
        const det = await fetch(
          `${API_BASE}/api/apartado_credito/creditos/${deuda.credito_id}/`
        );
        detalleActualizado = det.ok ? await det.json() : null;
      } else if (deuda.apartado_id) {
        const det = await fetch(
          `${API_BASE}/api/apartado_credito/apartados/${deuda.apartado_id}/`
        );
        detalleActualizado = det.ok ? await det.json() : null;
      }

      setClientesConDeuda((prev) =>
        prev
          .map((item) => {
            if (item.cliente.id !== abonoModal.clienteId) return item;
            const nuevasDeudas = item.deudas.map((d) => {
              if (d.venta_id === deuda.venta_id && d.tipo === deuda.tipo) {


                const montoPendienteActual =
                  detalleActualizado?.monto_pendiente ??
                  (d.monto_pendiente != null ? Math.max(0, d.monto_pendiente - parsed) : null);

                const estadoActualizado =
                  montoPendienteActual === 0
                    ? "Finalizado"
                    : (detalleActualizado?.estado_detalle ||
                      detalleActualizado?.estado ||
                      d.estado);
                return {
                  ...d,
                  cuotas_pendientes:
                    detalleActualizado?.cuotas_pendientes ??
                    (d.cuotas_pendientes != null
                      ? Math.max(0, d.cuotas_pendientes - 1)
                      : null),
                  monto_pendiente: montoPendienteActual,
                  estado: estadoActualizado,
                };
              }
              return d;
            });
            return { ...item, deudas: nuevasDeudas };
          })
          .map((item) => ({
            ...item,
            deudas: item.deudas.filter(
              (d) => getEstadoNombre(d.estado).toLowerCase() !== "finalizado"
            ),
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

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">
          Cargando deudas por cobrar... <SmallSpinner />
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Clientes - Deudas por Cobrar
        </h1>
      </div>

      <div className="mb-4">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o cédula..."
          className="w-full md:w-1/2 border border-gray-300 rounded-lg p-2"
        />
      </div>

      {clientesConDeuda.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">
          No hay clientes con deudas por cobrar.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {clientesConDeuda.map(({ cliente, deudas }) => (
            <div
              key={cliente.id}
              className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="p-4 flex justify-between items-start">
                <div
                  className="p-4 flex justify-between items-center cursor-pointer"
                  onClick={() =>
                    setOpenClientId(openClientId === cliente.id ? null : cliente.id)
                  }
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">
                      {cliente.nombre ||
                        cliente.razon_social ||
                        `${cliente.nombres || ""} ${cliente.apellidos || ""}`.trim()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      CI/NIT: {cliente.cedula || cliente.identificacion || "N/A"}
                    </p>
                  </div>

                  <div >
                    {openClientId === cliente.id ? "▲" : "▼"}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    Deudas: <span className="font-semibold">{deudas.length}</span>
                  </p>
                </div>
              </div>

              {openClientId === cliente.id && (
               <div className="p-4 bg-white border-t border-gray-200 transition-all duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deudas.map((d) => (
                    <div
                      key={d.venta_id + "-" + d.tipo}
                      className="p-3 rounded-lg border border-gray-100"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">
                            {d.tipo} — Venta #{d.venta_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total:{" "}
                            <span className="font-semibold">
                              {d.total ?? "0.00"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Pendiente:{" "}
                            <span className="font-semibold">
                              {d.monto_pendiente ?? "—"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Cuotas pendientes:{" "}
                            <span className="font-semibold">
                              {d.cuotas_pendientes ?? "—"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Fecha límite: {d.fecha_limite ?? "—"}
                          </p>
                          <p className="text-sm">
                            Estado:{" "}
                            <span className="font-semibold">
                              {d.estado ?? "—"}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => openAbonarModal(cliente, d)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white py-1 px-3 rounded-lg"
                          >
                            Abonar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      {abonoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Abonar - {abonoModal.clienteNombre}
              </h2>
              <button
                onClick={closeAbonarModal}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="mb-3">
              <p className="text-sm text-gray-600">
                Deuda:{" "}
                <span className="font-medium">
                  {abonoModal.deuda.tipo} — Venta #{abonoModal.deuda.venta_id}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Estado actual:{" "}
                <span className="font-medium">
                  {abonoModal.deuda.estado}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Monto pendiente:{" "}
                <span className="font-medium">
                  {abonoModal.deuda.monto_pendiente ?? "—"}
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
              className="w-full border border-gray-300 rounded-lg p-2 mb-3"
            />


           
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Método de Pago
            </label>

            <select
              value={abonoModal.metodo_pago}
              onChange={(e) =>
                setAbonoModal((s) => ({ ...s, metodo_pago: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg p-2 mb-3"
            >
              <option value="">Seleccione un método...</option>
              {metodosPago.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>

            

            {abonoModal.error && (
              <p className="text-red-500 text-sm mb-2">{abonoModal.error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={closeAbonarModal}
                className="py-2 px-4 rounded-lg border border-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={submitAbono}
                className="py-2 px-4 rounded-lg bg-emerald-600 text-white flex items-center gap-2"
                disabled={abonoModal.submitting}
              >
                {abonoModal.submitting ? <SmallSpinner /> : null}
                Confirmar abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeudasCobrar;
