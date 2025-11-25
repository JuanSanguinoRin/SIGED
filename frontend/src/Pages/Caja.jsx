"use client";
import { useState, useEffect } from "react";
import { FaEye, FaMoneyBillWave, FaCalendarAlt } from "react-icons/fa";
import { apiUrl } from "../config/api";

const Caja = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado de los datos
  const [cuentas, setCuentas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [deudasPorCobrar, setDeudasPorCobrar] = useState([]);
  const [deudasPorPagar, setDeudasPorPagar] = useState([]);

  // Fechas de la caja actual
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState("");

  // Modal de detalles
  const [modalDetalle, setModalDetalle] = useState(null);

  // =============================================
  // CARGAR DATOS INICIALES
  // =============================================
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Cuentas bancarias
      const resCuentas = await fetch(apiUrl("/caja/cuentas/"));
      const dataCuentas = await resCuentas.json();
      setCuentas(dataCuentas);

      // 2. Movimientos de caja (sin cerrar)
      const resMovimientos = await fetch(apiUrl("/caja/movimientos/?sin_cierre=true"));
      const dataMovimientos = await resMovimientos.json();
      setMovimientos(dataMovimientos);

      // 3. Deudas por cobrar (clientes)
      const resCobrar = await fetch(apiUrl("/apartado_credito/deudas-por-cobrar-optimizado/"));
      const dataCobrar = await resCobrar.json();
      setDeudasPorCobrar(dataCobrar);

      // 4. Deudas por pagar (proveedores)
      const resPagar = await fetch(apiUrl("/apartado_credito/deudas-por-pagar-optimizado/"));
      const dataPagar = await resPagar.json();
      setDeudasPorPagar(dataPagar);

    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos de caja");
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // CÁLCULOS DE RESUMEN
  // =============================================
  const calcularTotalBruto = () => {
    return cuentas.reduce((sum, c) => sum + parseFloat(c.saldo_actual || 0), 0);
  };

  const calcularTotalPorCobrar = () => {
    let total = 0;
    deudasPorCobrar.forEach(cliente => {
      cliente.deudas.forEach(deuda => {
        total += parseFloat(deuda.monto_pendiente || 0);
      });
    });
    return total;
  };

  const calcularTotalPorPagar = () => {
    let total = 0;
    deudasPorPagar.forEach(proveedor => {
      proveedor.deudas.forEach(deuda => {
        total += parseFloat(deuda.monto_pendiente || 0);
      });
    });
    return total;
  };

  const totalBruto = calcularTotalBruto();
  const totalPorCobrar = calcularTotalPorCobrar();
  const totalPorPagar = calcularTotalPorPagar();
  const totalNeto = totalBruto + totalPorCobrar - totalPorPagar;

  // =============================================
  // FORMATEAR NÚMEROS
  // =============================================
  const formatearMonto = (monto) => {
    const valor = parseFloat(monto || 0);
    const signo = valor < 0 ? "-" : "";
    const absoluto = Math.abs(valor);
    return `${signo}$${absoluto.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const claseMonto = (monto) => {
    return parseFloat(monto || 0) < 0 ? "text-red-600" : "text-gray-800";
  };

  // =============================================
  // SEPARAR MOVIMIENTOS POR TIPO
  // =============================================
  const ventas = movimientos.filter(m => m.venta_info !== null);
  const compras = movimientos.filter(m => m.compra_info !== null);
  const cuotasEntrada = movimientos.filter(m => 
    m.cuota_info !== null && m.tipo_movimiento.tipo === "E"
  );
  const cuotasSalida = movimientos.filter(m => 
    m.cuota_info !== null && m.tipo_movimiento.tipo === "S"
  );

  // =============================================
  // CERRAR CAJA
  // =============================================
  const handleCerrarCaja = async () => {
    if (!fechaFin) {
      alert("⚠️ Debe seleccionar una fecha de fin para cerrar la caja");
      return;
    }

    if (!window.confirm("¿Está seguro de cerrar la caja? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      const res = await fetch(apiUrl("/caja/cierres/realizar_cierre/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_cierre: "D",
          fecha_inicio: `${fechaInicio}T00:00:00`,
          fecha_fin: `${fechaFin}T23:59:59`,
          observaciones: "Cierre manual desde frontend",
          cerrado_por: "Usuario"
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al cerrar caja");
      }

      alert("✅ Caja cerrada exitosamente");
      window.location.reload();

    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  // =============================================
  // MODAL DE DETALLES
  // =============================================
  const abrirModalDetalle = (movimiento) => {
    setModalDetalle(movimiento);
  };

  const cerrarModalDetalle = () => {
    setModalDetalle(null);
  };

  // =============================================
  // RENDERIZADO
  // =============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Cargando datos de caja...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ========== HEADER ========== */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">💰 Caja</h1>
      </div>

      {/* ========== RESUMEN SUPERIOR ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Bruto */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <p className="text-sm opacity-90">Total Bruto</p>
          <p className={`text-3xl font-bold ${claseMonto(totalBruto)} text-white`}>
            {formatearMonto(totalBruto)}
          </p>
          <p className="text-xs mt-2 opacity-75">Dinero disponible en cuentas</p>
        </div>

        {/* Total Neto */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
          <p className="text-sm opacity-90">Total Neto</p>
          <p className={`text-3xl font-bold ${claseMonto(totalNeto)} text-white`}>
            {formatearMonto(totalNeto)}
          </p>
          <p className="text-xs mt-2 opacity-75">Bruto + Por Cobrar - Por Pagar</p>
        </div>

        {/* Por Cobrar / Pagar */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-between mb-2">
            <span className="text-sm opacity-90">Por Cobrar:</span>
            <span className="font-semibold">{formatearMonto(totalPorCobrar)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm opacity-90">Por Pagar:</span>
            <span className="font-semibold text-red-200">{formatearMonto(totalPorPagar)}</span>
          </div>
        </div>
      </div>

      {/* ========== FECHAS DE CAJA ========== */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FaCalendarAlt className="text-blue-500 text-xl" />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha de Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha de Cierre</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={handleCerrarCaja}
              className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              Cerrar Caja
            </button>
          </div>
        </div>
      </div>

      {/* ========== SALDO CAJA INICIAL (CUENTAS) ========== */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FaMoneyBillWave className="text-green-500" />
          Saldo Caja Inicial
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cuentas.map((cuenta) => (
            <div key={cuenta.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition">
              <p className="text-sm font-bold text-gray-700 mb-2">{cuenta.nombre}</p>
              <p className={`text-xl font-bold ${claseMonto(cuenta.saldo_actual)}`}> 
                {formatearMonto(cuenta.saldo_actual)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">TOTAL</span>
          <span className={`text-2xl font-bold ${claseMonto(totalBruto)}`}>
            {formatearMonto(totalBruto)}
          </span>
        </div>
      </div>

      {/* ========== TABLAS DE MOVIMIENTOS ========== */}
      
      {/* VENTAS */}
      <TablaMovimientos
        titulo="VENTAS"
        color="bg-green-500"
        datos={ventas}
        columnas={["#", "Cliente", "Producto", "Medio Pago", "Total"]}
        renderFila={(mov) => (
          <>
            <td className="px-4 py-3">{mov.venta_info?.id}</td>
            <td className="px-4 py-3">{mov.descripcion.split(" - ")[1] || "—"}</td>
            <td className="px-4 py-3 text-center">
              <button
                onClick={() => abrirModalDetalle(mov)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FaEye size={18} />
              </button>
            </td>
            <td className="px-4 py-3">{mov.tipo_movimiento.nombre}</td>
            <td className="px-4 py-3 text-right font-semibold">
              {formatearMonto(mov.monto)}
            </td>
          </>
        )}
      />

      {/* COMPRAS */}
      <TablaMovimientos
        titulo="COMPRAS"
        color="bg-red-500"
        datos={compras}
        columnas={["#", "Proveedor", "Tipo Material", "Medio Pago", "Total"]}
        renderFila={(mov) => (
          <>
            <td className="px-4 py-3">{mov.compra_info?.id}</td>
            <td className="px-4 py-3">{mov.descripcion.split(" - ")[1] || "—"}</td>
            <td className="px-4 py-3 text-center">
              <button
                onClick={() => abrirModalDetalle(mov)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FaEye size={18} />
              </button>
            </td>
            <td className="px-4 py-3">{mov.tipo_movimiento.nombre}</td>
            <td className="px-4 py-3 text-right font-semibold">
              {formatearMonto(mov.monto)}
            </td>
          </>
        )}
      />

      
      <TablaMovimientos
        titulo="INGRESOS (Pagos de Clientes)"
        color="bg-blue-500"
        datos={cuotasEntrada}
        columnas={["Venta #", "Cliente", "Medio Pago", "Total"]}
        renderFila={(mov) => {
          // ✅ Extraer el ID de venta desde la descripción
          const ventaId = mov.descripcion.match(/Venta #(\d+)/)?.[1] || "—";
          const clienteNombre = mov.descripcion.split(" - ")[0]?.replace("Abono de cliente ", "") || "—";

          return (
            <>
              <td className="px-4 py-3 font-mono text-blue-600">#{ventaId}</td>
              <td className="px-4 py-3">{clienteNombre}</td>
              <td className="px-4 py-3">{mov.tipo_movimiento.nombre}</td>
              <td className="px-4 py-3 text-right font-semibold">
                {formatearMonto(mov.monto)}
              </td>
            </>
          );
        }}
      />

      
      <TablaMovimientos
        titulo="EGRESOS (Pagos a Proveedores)"
        color="bg-orange-500"
        datos={cuotasSalida}
        columnas={["Compra #", "Proveedor", "Medio Pago", "Total"]}
        renderFila={(mov) => {
          // ✅ Extraer el ID de compra desde la descripción
          const compraId = mov.descripcion.match(/Compra #(\d+)/)?.[1] || "—";
          const proveedorNombre = mov.descripcion.split(" - ")[0]?.replace("Abono a proveedor ", "") || "—";

          return (
            <>
              <td className="px-4 py-3 font-mono text-orange-600">#{compraId}</td>
              <td className="px-4 py-3">{proveedorNombre}</td>
              <td className="px-4 py-3">{mov.tipo_movimiento.nombre}</td>
              <td className="px-4 py-3 text-right font-semibold">
                {formatearMonto(mov.monto)}
              </td>
            </>
          );
        }}
      />

      {/* ========== MODAL DE DETALLES ========== */}
      {modalDetalle && (
        <ModalDetalleMovimiento
          movimiento={modalDetalle}
          onClose={cerrarModalDetalle}
        />
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: TABLA DE MOVIMIENTOS
// =============================================
const TablaMovimientos = ({ titulo, color, datos, columnas, renderFila }) => {
  if (datos.length === 0) return null;

  return (
    <div className="mb-6">
      <div className={`${color} text-white px-4 py-2 rounded-t-lg font-semibold`}>
        {titulo}
      </div>
      <div className="bg-white rounded-b-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columnas.map((col, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {datos.map((dato, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {renderFila(dato)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE: MODAL DE DETALLES (MEJORADO)
// =============================================
const ModalDetalleMovimiento = ({ movimiento, onClose }) => {
  const [detalles, setDetalles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDetalles();
  }, []);

  const cargarDetalles = async () => {
    setLoading(true);
    try {
      let url = "";
      
      // Determinar si es venta o compra
      if (movimiento.venta_info) {
        url = apiUrl(`/compra_venta/ventas/${movimiento.venta_info.id}/`);
      } else if (movimiento.compra_info) {
        url = apiUrl(`/compra_venta/compras/${movimiento.compra_info.id}/`);
      }

      if (url) {
        const res = await fetch(url);
        const data = await res.json();
        setDetalles(data);
      }
    } catch (err) {
      console.error("Error cargando detalles:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatearMonto = (monto) => {
    return `$${parseFloat(monto || 0).toLocaleString("es-CO", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // ✅ Función de impresión mejorada
  const handleImprimir = () => {
    const contenidoModal = document.getElementById('modal-recibo-contenido');
    if (!contenidoModal) return;

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <html>
        <head>
          <title>Recibo - Movimiento #${movimiento.venta_info?.id || movimiento.compra_info?.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .total { font-size: 24px; font-weight: bold; color: #1e40af; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${contenidoModal.innerHTML}
        </body>
      </html>
    `);
    ventanaImpresion.document.close();
    ventanaImpresion.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">📄 Recibo de Movimiento</h3>
            <p className="text-sm opacity-90">
              {movimiento.tipo_movimiento.nombre} • {new Date(movimiento.fecha).toLocaleDateString("es-CO")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Información General */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Número</p>
                    <p className="text-lg font-semibold text-gray-800">
                      #{movimiento.venta_info?.id || movimiento.compra_info?.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {movimiento.tipo_movimiento.nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {movimiento.venta_info ? "Cliente" : "Proveedor"}
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {detalles?.cliente_nombre || detalles?.proveedor_nombre || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(movimiento.fecha).toLocaleDateString("es-CO", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {movimiento.observaciones && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                    <p className="text-sm text-gray-700 italic">{movimiento.observaciones}</p>
                  </div>
                )}
              </div>

              {/* ✅ Tabla de Prendas - CORREGIR EL MATERIAL */}
              {detalles?.prendas && detalles.prendas.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">💎</span>
                    Prendas Incluidas
                  </h4>
                  
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Prenda
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Material
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Gramos
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Precio/g
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Cant.
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {detalles.prendas.map((prenda, idx) => (
                          <tr key={idx} className="bg-white hover:bg-blue-50/30 transition">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-800">
                                {prenda.prenda_nombre}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {/* ✅ CORREGIDO: Usar tipo_oro en lugar de tipo_prenda */}
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                ${prenda.tipo_oro === "ITALIANO" 
                                  ? "bg-yellow-100 text-yellow-800" 
                                  : prenda.tipo_oro === "NACIONAL"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-blue-100 text-blue-800"
                                }`}>
                                {prenda.tipo_oro || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono text-gray-700">
                                {parseFloat(prenda.prenda_gramos || 0).toFixed(2)}g
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-gray-700">
                                {formatearMonto(prenda.precio_por_gramo)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                                {prenda.cantidad}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-gray-900">
                                {formatearMonto(prenda.subtotal)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resumen de Totales */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200">
                <div className="space-y-3">
                  {detalles?.total_gramos && (
                    <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                      <span className="text-sm font-medium text-gray-700">Total Gramos:</span>
                      <span className="text-lg font-semibold text-gray-800">
                        {parseFloat(detalles.total_gramos).toFixed(2)}g
                      </span>
                    </div>
                  )}

                  {detalles?.ganancia_total && parseFloat(detalles.ganancia_total) > 0 && (
                    <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                      <span className="text-sm font-medium text-gray-700">Ganancia Total:</span>
                      <span className="text-lg font-semibold text-green-600">
                        {formatearMonto(detalles.ganancia_total)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-gray-800">TOTAL:</span>
                    <span className="text-3xl font-bold text-blue-700">
                      {formatearMonto(movimiento.monto || detalles?.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Información adicional para ventas a crédito/apartado */}
              {movimiento.observaciones?.includes("crédito") && (
                <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Venta a Crédito</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Los ingresos se registrarán con cada cuota pagada por el cliente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {movimiento.observaciones?.includes("apartado") && (
                <div className="mt-4 bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">📦</span>
                    <div>
                      <p className="text-sm font-semibold text-purple-800">Venta con Apartado</p>
                      <p className="text-xs text-purple-700 mt-1">
                        Los ingresos se registrarán con cada cuota pagada por el cliente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

         {/* Footer del Modal */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleImprimir} // ✅ USAR LA FUNCIÓN PERSONALIZADA
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-medium transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Caja;