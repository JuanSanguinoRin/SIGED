"use client";
import { useState, useEffect, useRef } from "react";
import { FaEye, FaMoneyBillWave, FaChevronLeft, FaChevronRight, FaSpinner } from "react-icons/fa";

// ⚠️ IMPORTANTE: Ajusta esta función según tu configuración
const apiUrl = (path) => `https://siged-production.up.railway.app/api${path}`;

const Caja = () => {
  // =============================================
  // ESTADOS PRINCIPALES
  // =============================================
  const [loading, setLoading] = useState(true);
  const [loadingCambio, setLoadingCambio] = useState(false); // ✅ NUEVO: Loading al cambiar pestaña
  const [error, setError] = useState(null);

  // Estado de pestañas
  const [cierres, setCierres] = useState([]);
  const [cajaSeleccionada, setCajaSeleccionada] = useState("actual");
  
  // Datos según tipo de caja
  const [datosActual, setDatosActual] = useState(null);
  const [datosCierre, setDatosCierre] = useState(null);

  // Fechas para cerrar caja
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState("");

  // Modal de detalles
  const [modalDetalle, setModalDetalle] = useState(null);

  // Referencia para el scroll de pestañas
  const tabsContainerRef = useRef(null);

  // =============================================
  // CARGAR LISTA DE CIERRES (Al montar)
  // =============================================
  useEffect(() => {
    cargarCierres();
    cargarDatosActual(); // ✅ Cargar caja actual por defecto
  }, []);

  const cargarCierres = async () => {
    try {
      const res = await fetch(apiUrl("/caja/cierres/"));
      const data = await res.json();
      // Ordenar del más reciente al más antiguo
      setCierres(data.sort((a, b) => new Date(b.fecha_cierre) - new Date(a.fecha_cierre)));
    } catch (err) {
      console.error("Error cargando cierres:", err);
    }
  };

  // =============================================
  // CARGAR DATOS SEGÚN PESTAÑA SELECCIONADA
  // =============================================
  useEffect(() => {
    if (cajaSeleccionada === "actual") {
      cargarDatosActual();
    } else {
      cargarDatosCierre(cajaSeleccionada);
    }
  }, [cajaSeleccionada]);

  // ✅ CARGAR DATOS DE CAJA ACTUAL
  const cargarDatosActual = async () => {
    setLoadingCambio(true); // ✅ Activar loading
    setError(null);
    
    try {
      const [resCuentas, resMovimientos, resCobrar, resPagar] = await Promise.all([
        fetch(apiUrl("/caja/cuentas/")),
        fetch(apiUrl("/caja/movimientos/?sin_cierre=true")),
        fetch(apiUrl("/apartado_credito/deudas-por-cobrar-optimizado/")),
        fetch(apiUrl("/apartado_credito/deudas-por-pagar-optimizado/"))
      ]);

      const [cuentas, movimientos, cobrar, pagar] = await Promise.all([
        resCuentas.json(),
        resMovimientos.json(),
        resCobrar.json(),
        resPagar.json()
      ]);

      setDatosActual({ cuentas, movimientos, deudasPorCobrar: cobrar, deudasPorPagar: pagar });
      setDatosCierre(null);
    } catch (err) {
      console.error("Error cargando datos actuales:", err);
      setError("Error al cargar los datos de caja actual");
    } finally {
      setLoadingCambio(false); // ✅ Desactivar loading
      setLoading(false);
    }
  };

  // ✅ CARGAR DATOS DE CIERRE ESPECÍFICO
  const cargarDatosCierre = async (cierreId) => {
    setLoadingCambio(true); // ✅ Activar loading
    setError(null);
    
    try {
      const res = await fetch(apiUrl(`/caja/cierres/${cierreId}/`));
      const data = await res.json();
      setDatosCierre(data);
      setDatosActual(null);
    } catch (err) {
      console.error("Error cargando cierre:", err);
      setError("Error al cargar los datos del cierre");
    } finally {
      setLoadingCambio(false); // ✅ Desactivar loading
      setLoading(false);
    }
  };

  // =============================================
  // SCROLL DE PESTAÑAS
  // =============================================
  const scrollTabs = (direction) => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // =============================================
  // OBTENER DATOS SEGÚN VISTA (ACTUAL O CIERRE)
  // =============================================
  const obtenerDatosVista = () => {
    if (cajaSeleccionada === "actual" && datosActual) {
      // ✅ VISTA DE CAJA ACTUAL
      const totalBruto = datosActual.cuentas.reduce((sum, c) => sum + parseFloat(c.saldo_actual || 0), 0);
      
      let totalPorCobrar = 0;
      datosActual.deudasPorCobrar.forEach(cliente => {
        cliente.deudas.forEach(deuda => {
          totalPorCobrar += parseFloat(deuda.monto_pendiente || 0);
        });
      });

      let totalPorPagar = 0;
      datosActual.deudasPorPagar.forEach(proveedor => {
        proveedor.deudas.forEach(deuda => {
          totalPorPagar += parseFloat(deuda.monto_pendiente || 0);
        });
      });

      const totalNeto = totalBruto + totalPorCobrar - totalPorPagar;

      return {
        titulo: "Caja Actual",
        totalBruto,
        totalNeto,
        totalPorCobrar,
        totalPorPagar,
        cuentas: datosActual.cuentas,
        movimientos: datosActual.movimientos,
        esActual: true
      };
    } else if (datosCierre) {
      // ✅ VISTA DE CIERRE
      return {
        titulo: `Cierre ${datosCierre.tipo_cierre_display} - ${new Date(datosCierre.fecha_fin).toLocaleDateString('es-CO')}`,
        totalBruto: parseFloat(datosCierre.saldo_final || 0),
        totalEntradas: parseFloat(datosCierre.total_entradas || 0),
        totalSalidas: parseFloat(datosCierre.total_salidas || 0),
        saldoInicial: parseFloat(datosCierre.saldo_inicial || 0),
        cuentas: datosCierre.saldos_cuentas || [],
        movimientos: datosCierre.movimientos || [],
        esActual: false,
        fechaInicio: datosCierre.fecha_inicio,
        fechaFin: datosCierre.fecha_fin,
        cerradoPor: datosCierre.cerrado_por,
        observaciones: datosCierre.observaciones
      };
    }
    return null;
  };

  const datosVista = obtenerDatosVista();

  // =============================================
  // SEPARAR MOVIMIENTOS POR TIPO
  // =============================================
  const separarMovimientos = (movimientos) => {
    if (!movimientos || movimientos.length === 0) {
      return { 
        ventas: [], 
        compras: [], 
        cuotasEntrada: [], 
        cuotasSalida: [],
        ingresosOperativos: [],  // ✅ NUEVO
        egresosOperativos: []     // ✅ NUEVO
      };
    }

    // ✅ CORRECCIÓN: Manejo unificado para caja actual y cerrada
    return {
      ventas: movimientos.filter(m => {
        // Para caja actual usa venta_info, para cerrada usa venta
        const tieneVenta = m.venta !== null || m.venta_info !== null;
        const esVenta = m.tipo_movimiento_nombre?.toLowerCase().includes("venta") ||
                       m.tipo_movimiento?.nombre?.toLowerCase().includes("venta");
        return tieneVenta && esVenta;
      }),
      
      compras: movimientos.filter(m => {
        const tieneCompra = m.compra !== null || m.compra_info !== null;
        const esCompra = m.tipo_movimiento_nombre?.toLowerCase().includes("compra") ||
                        m.tipo_movimiento?.nombre?.toLowerCase().includes("compra");
        return tieneCompra && esCompra;
      }),
      
      cuotasEntrada: movimientos.filter(m => {
        const tieneCuota = m.cuota !== null || m.cuota_info !== null;
        const esEntrada = m.tipo_movimiento_tipo === "E" || m.tipo_movimiento?.tipo === "E";
        const esAbono = m.tipo_movimiento_nombre?.toLowerCase().includes("abono") ||
                       m.tipo_movimiento_nombre?.toLowerCase().includes("cliente") ||
                       m.tipo_movimiento?.nombre?.toLowerCase().includes("abono") ||
                       m.tipo_movimiento?.nombre?.toLowerCase().includes("cliente");
        return tieneCuota && esEntrada && esAbono;
      }),
      
      cuotasSalida: movimientos.filter(m => {
        const tieneCuota = m.cuota !== null || m.cuota_info !== null;
        const esSalida = m.tipo_movimiento_tipo === "S" || m.tipo_movimiento?.tipo === "S";
        const esAbono = m.tipo_movimiento_nombre?.toLowerCase().includes("abono") ||
                       m.tipo_movimiento_nombre?.toLowerCase().includes("proveedor") ||
                       m.tipo_movimiento?.nombre?.toLowerCase().includes("abono") ||
                       m.tipo_movimiento?.nombre?.toLowerCase().includes("proveedor");
        return tieneCuota && esSalida && esAbono;
      }), 

       // ✅ NUEVO: Ingresos Operativos
      ingresosOperativos: movimientos.filter(m => {
        
        const esIngresoOp = m.tipo_movimiento_nombre?.toLowerCase().includes("ingreso operativo") ||
                           m.tipo_movimiento?.nombre?.toLowerCase().includes("ingreso operativo");
        return  esIngresoOp;
      }),

      // ✅ NUEVO: Egresos Operativos
      egresosOperativos: movimientos.filter(m => {
        
        const esEgresoOp = m.tipo_movimiento_nombre?.toLowerCase().includes("egreso operativo") ||
                          m.tipo_movimiento?.nombre?.toLowerCase().includes("egreso operativo");
        return  esEgresoOp;
      })
    };
  };

  const { ventas, compras, cuotasEntrada, cuotasSalida, ingresosOperativos, egresosOperativos } = separarMovimientos(datosVista?.movimientos);

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
  // VISTA DE CARGA INICIAL
  // =============================================
  if (loading && !datosVista) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <div className="text-xl text-gray-600">Cargando datos...</div>
        </div>
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

  // =============================================
  // RENDERIZADO PRINCIPAL
  // =============================================
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ========== HEADER CON PESTAÑAS ========== */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">💰 Caja</h1>
        
        {/* Sistema de Pestañas */}
        <div className="bg-white rounded-xl shadow-md p-2 flex items-center gap-2">
          {/* Botón Scroll Izquierda */}
          {cierres.length > 3 && (
            <button
              onClick={() => scrollTabs("left")}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FaChevronLeft className="text-gray-600" />
            </button>
          )}

          {/* Contenedor de Pestañas con Scroll */}
          <div
            ref={tabsContainerRef}
            className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* ✅ Pestaña Caja Actual - PRIMERO (Izquierda) */}
            <button
              onClick={() => setCajaSeleccionada("actual")}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition ${
                cajaSeleccionada === "actual"
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="text-sm font-bold">🟢 Actual</div>
              <div className="text-xs opacity-75">En curso</div>
            </button>

            {/* ✅ Pestañas de Cierres Anteriores (Más reciente → Más antiguo) */}
            {cierres.map((cierre) => (
              <button
                key={cierre.id}
                onClick={() => setCajaSeleccionada(cierre.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition ${
                  cajaSeleccionada === cierre.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="text-sm">
                  {cierre.tipo_cierre_display} #{cierre.id}
                </div>
                <div className="text-xs opacity-75">
                  {new Date(cierre.fecha_fin).toLocaleDateString('es-CO', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </button>
            ))}
          </div>

          {/* Botón Scroll Derecha */}
          {cierres.length > 3 && (
            <button
              onClick={() => scrollTabs("right")}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FaChevronRight className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* ✅ OVERLAY DE CARGA AL CAMBIAR PESTAÑA */}
      {loadingCambio && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <FaSpinner className="animate-spin text-5xl text-blue-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-800">Cargando datos...</p>
            <p className="text-sm text-gray-500 mt-2">Por favor espere</p>
          </div>
        </div>
      )}

      {/* ========== CONTENIDO DE LA CAJA SELECCIONADA ========== */}
      {datosVista && !loadingCambio && (
        <>
          {/* ========== RESUMEN SUPERIOR ========== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {datosVista.esActual ? (
              <>
                {/* Total Bruto */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                  <p className="text-sm opacity-90">Total Bruto</p>
                  <p className="text-3xl font-bold">
                    {formatearMonto(datosVista.totalBruto)}
                  </p>
                  <p className="text-xs mt-2 opacity-75">Dinero disponible en cuentas</p>
                </div>

                {/* Total Neto */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
                  <p className="text-sm opacity-90">Total Neto</p>
                  <p className="text-3xl font-bold">
                    {formatearMonto(datosVista.totalNeto)}
                  </p>
                  <p className="text-xs mt-2 opacity-75">Bruto + Por Cobrar - Por Pagar</p>
                </div>

                {/* Por Cobrar / Pagar */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm opacity-90">Por Cobrar:</span>
                    <span className="font-semibold">{formatearMonto(datosVista.totalPorCobrar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm opacity-90">Por Pagar:</span>
                    <span className="font-semibold text-red-200">{formatearMonto(datosVista.totalPorPagar)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Saldo Inicial */}
                <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-xl p-6 shadow-lg">
                  <p className="text-sm opacity-90">Saldo Inicial</p>
                  <p className="text-3xl font-bold">
                    {formatearMonto(datosVista.saldoInicial)}
                  </p>
                  <p className="text-xs mt-2 opacity-75">Al inicio del período</p>
                </div>

                {/* Entradas y Salidas */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm opacity-90">Entradas:</span>
                    <span className="font-semibold text-green-200">{formatearMonto(datosVista.totalEntradas)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm opacity-90">Salidas:</span>
                    <span className="font-semibold text-red-200">{formatearMonto(datosVista.totalSalidas)}</span>
                  </div>
                </div>

                {/* Saldo Final */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
                  <p className="text-sm opacity-90">Saldo Final</p>
                  <p className="text-3xl font-bold">
                    {formatearMonto(datosVista.totalBruto)}
                  </p>
                  <p className="text-xs mt-2 opacity-75">Al cierre del período</p>
                </div>
              </>
            )}
          </div>

          {/* ========== INFORMACIÓN DEL CIERRE ========== */}
          {!datosVista.esActual && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Fecha Inicio</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(datosVista.fechaInicio).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha Cierre</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(datosVista.fechaFin).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cerrado por</p>
                  <p className="font-semibold text-gray-800">{datosVista.cerradoPor || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Movimientos</p>
                  <p className="font-semibold text-gray-800">{datosVista.movimientos.length}</p>
                </div>
              </div>
              {datosVista.observaciones && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Observaciones</p>
                  <p className="text-sm text-gray-800">{datosVista.observaciones}</p>
                </div>
              )}
            </div>
          )}

          {/* ========== FECHAS DE CAJA (Solo para caja actual) ========== */}
          {datosVista.esActual && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
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
          )}

          {/* ========== SALDO POR CUENTA ========== */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FaMoneyBillWave className="text-green-500" />
              {datosVista.esActual ? "Saldo Caja Inicial" : "Saldo al Cierre"}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {datosVista.cuentas.map((cuenta, idx) => (
                <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition">
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    {datosVista.esActual ? cuenta.nombre : cuenta.cuenta_nombre}
                  </p>
                  <p className={`text-xl font-bold ${claseMonto(datosVista.esActual ? cuenta.saldo_actual : cuenta.saldo)}`}>
                    {formatearMonto(datosVista.esActual ? cuenta.saldo_actual : cuenta.saldo)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">TOTAL</span>
              <span className={`text-2xl font-bold ${claseMonto(datosVista.totalBruto)}`}>
                {formatearMonto(datosVista.totalBruto)}
              </span>
            </div>
          </div>

          {/* ========== TABLAS DE MOVIMIENTOS ========== */}
          
          {/* VENTAS */}
          <TablaMovimientos
            titulo="VENTAS"
            color="bg-green-500"
            datos={ventas}
            columnas={["#", "Cliente", "Producto", "Medio Pago", "Fecha", "Total"]}
            esActual={datosVista.esActual}
            renderFila={(mov) => (
              <>
                <td className="px-4 py-3">{mov.venta || mov.venta_info?.id || "—"}</td>
                <td className="px-4 py-3">{mov.descripcion.split(" - ")[1] || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => abrirModalDetalle(mov)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaEye size={18} />
                  </button>
                </td>
                <td className="px-4 py-3">{mov.tipo_movimiento_nombre || mov.tipo_movimiento?.nombre}</td>
                {/* NUEVA COLUMNA FECHA */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(mov.fecha).toLocaleDateString("es-CO")}
                </td>
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
            columnas={["#", "Proveedor", "Tipo Material", "Medio Pago","Fecha", "Total"]}
            esActual={datosVista.esActual}
            renderFila={(mov) => (
              <>
                <td className="px-4 py-3">{mov.compra || mov.compra_info?.id || "—"}</td>
                <td className="px-4 py-3">{mov.descripcion.split(" - ")[1] || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => abrirModalDetalle(mov)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaEye size={18} />
                  </button>
                </td>
                <td className="px-4 py-3">{mov.tipo_movimiento_nombre || mov.tipo_movimiento?.nombre}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(mov.fecha).toLocaleDateString("es-CO")}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatearMonto(mov.monto)}
                </td>
              </>
            )}
          />

          {/* INGRESOS (Pagos de Clientes) */}
          <TablaMovimientos
            titulo="INGRESOS (Pagos de Clientes)"
            color="bg-blue-500"
            datos={cuotasEntrada}
            columnas={["Venta #", "Cliente", "Medio Pago","Fecha", "Total"]}
            esActual={datosVista.esActual}
            renderFila={(mov) => {
              const ventaId = mov.descripcion.match(/Venta #(\d+)/)?.[1] || "—";
              const clienteNombre = mov.descripcion.split(" - ")[0]?.replace("Abono de cliente ", "") || "—";

              return (
                <>
                  <td className="px-4 py-3 font-mono text-blue-600">#{ventaId}</td>
                  <td className="px-4 py-3">{clienteNombre}</td>
                  <td className="px-4 py-3">{mov.tipo_movimiento_nombre || mov.tipo_movimiento?.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(mov.fecha).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatearMonto(mov.monto)}
                  </td>
                </>
              );
            }}
          />

          {/* EGRESOS (Pagos a Proveedores) */}
          <TablaMovimientos
            titulo="EGRESOS (Pagos a Proveedores)"
            color="bg-orange-500"
            datos={cuotasSalida}
            columnas={["Compra #", "Proveedor", "Medio Pago","Fecha", "Total"]}
            esActual={datosVista.esActual}
            renderFila={(mov) => {
              const compraId = mov.descripcion.match(/Compra #(\d+)/)?.[1] || "—";
              const proveedorNombre = mov.descripcion.split(" - ")[0]?.replace("Abono a proveedor ", "") || "—";

              return (
                <>
                  <td className="px-4 py-3 font-mono text-orange-600">#{compraId}</td>
                  <td className="px-4 py-3">{proveedorNombre}</td>
                  <td className="px-4 py-3">{mov.tipo_movimiento_nombre || mov.tipo_movimiento?.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(mov.fecha).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatearMonto(mov.monto)}
                  </td>
                </>
              );
            }}
          />

          {/* ✅ NUEVO: INGRESOS OPERATIVOS */}
          <TablaMovimientos
            titulo="INGRESOS OPERATIVOS (Otros Ingresos)"
            color="bg-teal-500"
            datos={ingresosOperativos}
            columnas={["#", "Descripción", "Medio Pago", "Fecha", "Total"]}
            esActual={datosVista.esActual}
            renderFila={(mov) => {
              const ingresoId = mov.ingreso || mov.ingreso_info?.id || "—";
              const descripcion = mov.ingreso_info?.descripcion || 
                                 mov.descripcion.split(" - ")[1] || 
                                 mov.descripcion;

              return (
                <>
                  <td className="px-4 py-3 font-mono text-teal-600">#{ingresoId}</td>
                  <td className="px-4 py-3">{descripcion}</td>
                  <td className="px-4 py-3">{mov.tipo_movimiento_nombre || mov.tipo_movimiento?.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(mov.fecha).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-teal-700">
                    {formatearMonto(mov.monto)}
                  </td>
                </>
              );
            }}
          />

           {/* ✅ NUEVO: EGRESOS OPERATIVOS */}
          <TablaMovimientos
            titulo="EGRESOS OPERATIVOS (Gastos del Negocio)"
            color="bg-red-600"
            datos={egresosOperativos}
            columnas={["#", "Descripción", "Medio Pago", "Fecha", "Total"]}
            esActual={datosVista.esActual}
            renderFila={(mov) => {
              const egresoId = mov.egreso || mov.egreso_info?.id || "—";
              const descripcion = mov.egreso_info?.descripcion || 
                                 mov.descripcion.split(" - ")[1] || 
                                 mov.descripcion;

              return (
                <>
                  <td className="px-4 py-3 font-mono text-red-600">#{egresoId}</td>
                  <td className="px-4 py-3">{descripcion}</td>
                  <td className="px-4 py-3">{mov.tipo_movimiento_nombre || mov.tipo_movimiento?.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(mov.fecha).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">
                    {formatearMonto(mov.monto)}
                  </td>
                </>
              );
            }}
          />
        </>
      )}

      {/* ========== MODAL DE DETALLES ========== */}
      {modalDetalle && (
        <ModalDetalleMovimiento
          movimiento={modalDetalle}
          onClose={cerrarModalDetalle}
          esActual={datosVista?.esActual}
        />
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: TABLA DE MOVIMIENTOS
// =============================================
const TablaMovimientos = ({ titulo, color, datos, columnas, renderFila, esActual }) => {
  if (datos.length === 0) return null;

  return (
    <div className="mb-6">
      <div className={`${color} text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center`}>
        <span>{titulo}</span>
        <span className="text-sm opacity-90">({datos.length} registros)</span>
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
const ModalDetalleMovimiento = ({ movimiento, onClose, esActual }) => {
  const [detalles, setDetalles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDetalles();
  }, []);

  const cargarDetalles = async () => {
    setLoading(true);
    try {
      let url = "";
      
      // ✅ Determinar si es venta o compra (maneja ambos formatos)
      const ventaId = movimiento.venta || movimiento.venta_info?.id;
      const compraId = movimiento.compra || movimiento.compra_info?.id;
      
      if (ventaId) {
        url = apiUrl(`/compra_venta/ventas/${ventaId}/`);
      } else if (compraId) {
        url = apiUrl(`/compra_venta/compras/${compraId}/`);
      }

      if (url) {
        const res = await fetch(url);
        const data = await res.json();
        
        // ✅ Cargar tipos de oro ANTES de actualizar el estado
        if (data.prendas && data.prendas.length > 0) {
          const prendasConDatos = await Promise.all(
          data.prendas.map(async (p) => {
            const prendaCompleta = await obtenerPrendaCompleta(p.prenda);
            return {
              ...p,
              tipo_oro: prendaCompleta.tipo_oro_nombre,
              es_chatarra: prendaCompleta.es_chatarra,
              es_recuperable: prendaCompleta.es_recuperable,
            };
          })
          );
          data.prendas = prendasConDatos;
        }
        
        setDetalles(data);
      }
    } catch (err) {
      console.error("Error cargando detalles:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatearMonto = (monto) => {
    return `${parseFloat(monto || 0).toLocaleString("es-CO", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const obtenerPrendaCompleta = async (id) => {
    const res = await fetch(apiUrl(`/prendas/prendas/${id}/`));
    return await res.json();  
};

  // ✅ Obtener nombre del tipo de movimiento
  const nombreTipoMovimiento = movimiento.tipo_movimiento_nombre || movimiento.tipo_movimiento?.nombre || "—";
  
  // ✅ Obtener ID de venta/compra
  const idMovimiento = movimiento.venta || movimiento.venta_info?.id || movimiento.compra || movimiento.compra_info?.id;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
          <div>
            <h3 className="text-2xl font-bold">📄 Recibo de Movimiento</h3>
            <p className="text-sm opacity-90">
              {nombreTipoMovimiento} • {new Date(movimiento.fecha).toLocaleDateString("es-CO")}
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

        {/* Contenido imprimible */}
        <div id="modal-recibo-contenido" className="p-6">
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
                      #{idMovimiento}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {nombreTipoMovimiento}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {movimiento.venta || movimiento.venta_info ? "Cliente" : "Proveedor"}
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

              {/* Tabla de Prendas */}
              {detalles?.prendas && detalles.prendas.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-2xl">💎</span>
                    Prendas Incluidas
                  </h4>
                  
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Prenda
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Material
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Gramos
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Precio/g
                            </th>
                            <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Cant.
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Chat.
                            </th>
                            <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Rec.
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {detalles.prendas.map((prenda, idx) => (
                            <tr key={idx} className="bg-white hover:bg-blue-50/30 transition">
                              <td className="px-3 py-3">
                                <span className="font-medium text-gray-800">
                                  {prenda.prenda_nombre}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                  ${prenda.tipo_oro === "ITALIANO" 
                                    ? "bg-yellow-100 text-yellow-800" 
                                    : prenda.tipo_oro === "NACIONAL"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-blue-100 text-blue-800"
                                  }`}>
                                  {prenda.tipo_oro || "..."}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="font-mono text-gray-700">
                                  {parseFloat(prenda.prenda_gramos || 0).toFixed(2)}g
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className="font-mono text-gray-700">
                                  {formatearMonto(prenda.precio_por_gramo)}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                                  {prenda.cantidad}
                                </span>
                              </td>
                              {/* Columna Chatarra */}
                              <td className="px-2 py-3 text-center">
                                {prenda.es_chatarra ? (
                                  <svg className="w-5 h-5 mx-auto text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              {/* Columna Recuperable */}
                              <td className="px-2 py-3 text-center">
                                {prenda.es_recuperable ? (
                                  <svg className="w-5 h-5 mx-auto text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
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
            onClick={() => window.print()}
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
