import React, { useState, useEffect } from "react";
import { apiUrl } from "../config/api";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FaChartLine, FaCoins, FaBell, FaExclamationCircle, FaBoxOpen, FaShoppingCart } from "react-icons/fa";

export default function Inicio() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de datos
  const [datosGrafico, setDatosGrafico] = useState([]);
  const [ventasVsCompras, setVentasVsCompras] = useState([]);
  const [stockTotal, setStockTotal] = useState(0);
  const [apartadoTotal, setApartadoTotal] = useState(0);
  const [promediosOro, setPromediosOro] = useState({ nacional: 0, italiano: 0 });
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [deudasPagar, setDeudasPagar] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Cargar Cierres para el Gráfico de Ganancias
      const resCierres = await fetch(apiUrl("/caja/cierres/"));
      const dataCierres = await resCierres.json();

      const cierresProcesados = dataCierres
        .slice(0, 7)
        .reverse()
        .map((cierre) => ({
          fecha: new Date(cierre.fecha_cierre).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
          }),
          ganancia: parseFloat(cierre.total_entradas) - parseFloat(cierre.total_salidas),
        }));
      setDatosGrafico(cierresProcesados);

      // 2. Cargar estadísticas optimizadas del dashboard
      const resDashboard = await fetch(apiUrl("/compra_venta/dashboard/resumen/"));
      const dataDashboard = await resDashboard.json();

      setStockTotal(dataDashboard.stock_total || 0);
      setApartadoTotal(dataDashboard.apartado_total || 0);
      setPromediosOro({
        nacional: dataDashboard.promedio_oro_nacional || 0,
        italiano: dataDashboard.promedio_oro_italiano || 0,
      });
      setVentasVsCompras(dataDashboard.ventas_vs_compras || []);

      // 3. Cargar Deudas por Cobrar (Clientes)
      const resDeudasCobrar = await fetch(apiUrl("/apartado_credito/deudas-por-cobrar-optimizado/"));
      const dataDeudasCobrar = await resDeudasCobrar.json();

      const deudasCobrarFlat = [];
      dataDeudasCobrar.forEach((item) => {
        const clienteNombre = item.cliente.nombre ||
          item.cliente.razon_social ||
          `${item.cliente.nombres || ""} ${item.cliente.apellidos || ""}`.trim();

        item.deudas.forEach((deuda) => {
          const estadoNombre = typeof deuda.estado === "string" ? deuda.estado : (deuda.estado?.nombre || "");
          if (estadoNombre.toLowerCase() === "en proceso") {
            deudasCobrarFlat.push({
              nombre: clienteNombre,
              monto: parseFloat(deuda.monto_pendiente || 0),
              fechaLimite: deuda.fecha_limite,
              tipo: deuda.tipo,
              origen: "cobrar"
            });
          }
        });
      });

      // 4. Cargar Deudas por Pagar (Proveedores)
      const resDeudasPagar = await fetch(apiUrl("/apartado_credito/deudas-por-pagar-optimizado/"));
      const dataDeudasPagar = await resDeudasPagar.json();

      const deudasPagarFlat = [];
      dataDeudasPagar.forEach((item) => {
        item.deudas.forEach((deuda) => {
          const estadoNombre = typeof deuda.estado === "string" ? deuda.estado : (deuda.estado?.nombre || "");
          if (estadoNombre.toLowerCase() === "en proceso") {
            deudasPagarFlat.push({
              nombre: item.proveedor.nombre,
              monto: parseFloat(deuda.monto_pendiente || 0),
              fechaLimite: deuda.fecha_limite,
              tipo: deuda.tipo,
              origen: "pagar"
            });
          }
        });
      });

      // Ordenar y setear
      const ordenarPorFecha = (arr) => {
        return arr.sort((a, b) => {
          if (!a.fechaLimite) return 1;
          if (!b.fechaLimite) return -1;
          return new Date(a.fechaLimite) - new Date(b.fechaLimite);
        }).slice(0, 5);
      };

      setPagosPendientes(ordenarPorFecha(deudasCobrarFlat));
      setDeudasPagar(ordenarPorFecha(deudasPagarFlat));

    } catch (err) {
      console.error("Error cargando datos de inicio:", err);
      setError("No se pudieron cargar algunos datos del tablero.");
    } finally {
      setLoading(false);
    }
  };

  const formatearMoneda = (valor) => {
    return `$${parseFloat(valor).toLocaleString("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Panel de Inicio</h1>
          <p className="text-gray-500 mt-1">Resumen general de tu negocio</p>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {new Date().toLocaleDateString("es-CO", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3">
          <FaExclamationCircle className="text-red-500 text-xl" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tarjetas de Resumen (Stock y Apartado) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-full">
            <FaBoxOpen className="text-emerald-600 text-xl" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Stock Disponible</p>
            <p className="text-2xl font-bold text-gray-800">{stockTotal.toFixed(2)} g</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-full">
            <FaShoppingCart className="text-amber-600 text-xl" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">En Apartado</p>
            <p className="text-2xl font-bold text-gray-800">{apartadoTotal.toFixed(2)} g</p>
          </div>
        </div>

        {/* Promedios de Oro (Ahora en tarjetas pequeñas también) */}
        <div className="bg-blue-50 rounded-xl shadow-sm p-6 border border-blue-100 flex items-center gap-4">
          <div className="p-3 bg-white rounded-full">
            <FaCoins className="text-blue-600 text-xl" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">Oro Nacional</p>
            <p className="text-xl font-bold text-gray-800">{formatearMoneda(promediosOro.nacional)}/g</p>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-xl shadow-sm p-6 border border-yellow-100 flex items-center gap-4">
          <div className="p-3 bg-white rounded-full">
            <FaCoins className="text-yellow-600 text-xl" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-800">Oro Italiano</p>
            <p className="text-xl font-bold text-gray-800">{formatearMoneda(promediosOro.italiano)}/g</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Gráficos (2/3 del ancho) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Gráfico de Ventas vs Compras */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaChartLine className="text-purple-600" />
              Ventas vs Compras (7 días)
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ventasVsCompras} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatearMoneda(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ventas" name="Ventas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="compras" name="Compras" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Ganancias */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaChartLine className="text-blue-600" />
              Ganancia Neta (Cierres de Caja)
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatearMoneda(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="ganancia" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ganancia" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Notificaciones (1/3 del ancho) */}
        <div className="lg:col-span-1 space-y-6">

          {/* Deudas por Cobrar */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaBell className="text-orange-500" />
              Por Cobrar (Clientes)
            </h2>
            <div className="space-y-3">
              {pagosPendientes.length > 0 ? (
                pagosPendientes.map((pago, index) => (
                  <div key={index} className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-gray-700">{pago.nombre}</span>
                      <span className="text-xs font-medium text-red-500 bg-white px-2 py-0.5 rounded-full border border-red-100">
                        {pago.fechaLimite ? new Date(pago.fechaLimite).toLocaleDateString() : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-gray-500 capitalize">{pago.tipo}</span>
                      <span className="text-sm font-bold text-gray-800">{formatearMoneda(pago.monto)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 py-4">Al día con los clientes</p>
              )}
            </div>
            <div className="mt-4 text-center">
              <a href="/admin/deudas/cobrar" className="text-xs font-medium text-blue-600 hover:underline">Ver todo</a>
            </div>
          </div>

          {/* Deudas por Pagar */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaExclamationCircle className="text-red-500" />
              Por Pagar (Proveedores)
            </h2>
            <div className="space-y-3">
              {deudasPagar.length > 0 ? (
                deudasPagar.map((deuda, index) => (
                  <div key={index} className="p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-gray-700">{deuda.nombre}</span>
                      <span className="text-xs font-medium text-red-600 bg-white px-2 py-0.5 rounded-full border border-red-100">
                        {deuda.fechaLimite ? new Date(deuda.fechaLimite).toLocaleDateString() : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-gray-500 capitalize">{deuda.tipo}</span>
                      <span className="text-sm font-bold text-gray-800">{formatearMoneda(deuda.monto)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 py-4">Sin deudas pendientes</p>
              )}
            </div>
            <div className="mt-4 text-center">
              <a href="/admin/deudas/pagar" className="text-xs font-medium text-blue-600 hover:underline">Ver todo</a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
