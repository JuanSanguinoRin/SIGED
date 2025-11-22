import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaMoneyBillWave } from "react-icons/fa";
import { apiUrl } from "../config/api";

const BASE_URL = "http://127.0.0.1:8000/api/";

const VentaForm = () => {
  const [clientes, setClientes] = useState([]);
  const [prendas, setPrendas] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  const [mensaje, setMensaje] = useState(null);

  const [venta, setVenta] = useState({
    clienteId: "",
    clienteNombre: "",
    descripcion: "",
    metodo_pago: "",
    credito: false,
    apartado: false,
    prendas: [],
  });

  const [creditoData, setCreditoData] = useState({
    cantidad_cuotas: "",
    interes: "",
    fecha_limite: "",
  });

  const [apartadoData, setApartadoData] = useState({
    cantidad_cuotas: "",
    fecha_limite: "",
  });

  const [totales, setTotales] = useState({
    totalVenta: 0,
    totalGanancia: 0,
    totalConInteres: 0,
  });

  // ==============================================
  // CARGAR DATOS INICIALES
  // ==============================================
  useEffect(() => {
    fetchClientes();
    fetchPrendas();
    fetchMetodosPago();
  }, []);

  const fetchClientes = async () => {
    const res = await axios.get(apiUrl("/terceros/clientes/"));
    setClientes(res.data);
  };

  const fetchPrendas = async () => {
    const res = await axios.get(apiUrl("/prendas/prendas/"));
    const data = Array.isArray(res.data) ? res.data : res.data.results;
    setPrendas(data.filter(p => !p.archivado && p.existencia > 0));
  };

  const fetchMetodosPago = async () => {
    const res = await axios.get(apiUrl("/dominios_comunes/metodos-pago/"));
    setMetodosPago(res.data);
  };

  // ==============================================
  // MANEJO DE FORMULARIO
  // ==============================================
  const handleClienteSelect = (e) => {
    const nombre = e.target.value;
    const cliente = clientes.find(c => c.nombre === nombre);
    setVenta({
      ...venta,
      clienteNombre: nombre,
      clienteId: cliente?.id ?? "",
    });
  };

  const handleChange = (e) => {
    setVenta({ ...venta, [e.target.name]: e.target.value });
  };

  const handleAddPrenda = () => {
    setVenta({
      ...venta,
      prendas: [
        ...venta.prendas,
        { prendaId: "", nombre: "", cantidad: 0, precio_por_gramo: 0, gramo_ganancia: 0 },
      ],
    });
  };

  const handleRemovePrenda = (i) => {
    let updated = [...venta.prendas];
    updated.splice(i, 1);
    setVenta({ ...venta, prendas: updated });
    calcularTotales(updated);
  };

  const handlePrendaChange = (i, field, value) => {
    const updated = [...venta.prendas];
    updated[i][field] = value;

    if (field === "nombre") {
      const prenda = prendas.find(p => p.nombre === value);
      if (prenda) {
        updated[i] = {
          ...updated[i],
          prendaId: prenda.id,
          existencia: prenda.existencia,
          gramos: Number(prenda.gramos),
          material: prenda.tipo_oro_nombre,
        };
      }
    }

    setVenta({ ...venta, prendas: updated });
    calcularTotales(updated);
  };

  // ==============================================
  // CÁLCULOS DE TOTALES
  // ==============================================
 const calcularTotales = (prendasVenta) => {
  let totalVenta = 0;
  let totalGanancia = 0;

  prendasVenta.forEach(p => {
    const gramos = Number(p.gramos || 0);
    const precio = Number(p.precio_por_gramo || 0);
    const cantidad = Number(p.cantidad || 0);
    const gramoGanancia = Number(p.gramo_ganancia || 0);

    const totalPorPrenda = gramos * precio * cantidad;
    const gananciaPorPrenda = gramoGanancia * precio * quantityOrZero(cantidad);

    totalVenta += totalPorPrenda;
    totalGanancia += gananciaPorPrenda;
  });

  const base = totalVenta + totalGanancia;
  const interesDecimal = parseFloat(creditoData.interes || 0) / 100;

  const totalConInteres = parseFloat((base * (1 + interesDecimal)).toFixed(2));

  setTotales({
    totalVenta: parseFloat(totalVenta.toFixed(2)),
    totalGanancia: parseFloat(totalGanancia.toFixed(2)),
    totalConInteres,
  });
};

// helper (evita usar variable no declarada)
function quantityOrZero(q) {
  return Number(q || 0);
}

  // ==============================================
  // SUBMIT (Crear crédito → Crear venta)
  // ==============================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // VALIDAR EXISTENCIAS
      for (const p of venta.prendas) {
        if (p.cantidad > p.existencia) {
          alert(`No hay suficientes existencias para "${p.nombre}". Disponible: ${p.existencia}`);
          return;
        }
      }

      let creditoId = null;
      let apartadoId = null;

      // CREAR CRÉDITO
      if (venta.credito) {
        const res = await axios.post(apiUrl("/apartado_credito/creditos/"), {
           cantidad_cuotas: Number(creditoData.cantidad_cuotas),
           cuotas_pendientes: Number(creditoData.cantidad_cuotas), // <- obligatorio
           interes: Number(creditoData.interes),
           estado: 4,
           fecha_limite: creditoData.fecha_limite,
           monto_total: totales.totalConInteres,
           monto_pendiente: totales.totalConInteres,
         });
 
        creditoId = res.data.id;
      }

      // CREAR APARTADO
      if (venta.apartado) {
        const res = await axios.post(apiUrl("/apartado_credito/apartados/"), {
           cantidad_cuotas: Number(apartadoData.cantidad_cuotas),
           cuotas_pendientes: Number(creditoData.cantidad_cuotas), // <- obligatorio
           estado: 4,
           fecha_limite: apartadoData.fecha_limite,
         });
 
        apartadoId = res.data.id;
      }

      // CREAR LA VENTA
      await axios.post(apiUrl("/compra_venta/ventas/"), {
        cliente: venta.clienteId,
        descripcion: venta.descripcion,
        metodo_pago: venta.metodo_pago,
        credito: creditoId,
        apartado: apartadoId,

        ganancia_total: totales.totalGanancia,
        total: totales.totalConInteres,

        prendas: venta.prendas.map(p => ({
          prenda: p.prendaId,
          cantidad: Number(p.cantidad),
          precio_por_gramo: Number(p.precio_por_gramo),
          gramo_ganancia: Number(p.gramo_ganancia),
        })),
      });

      // MENSAJE DE ÉXITO
      setMensaje({ tipo: "success", texto: "Venta registrada correctamente" });
      setTimeout(() => setMensaje(null), 3000);

      // RESET
      setVenta({
        clienteId: "",
        clienteNombre: "",
        descripcion: "",
        metodo_pago: "",
        prendas: [],
        credito: false,
        apartado: false,
      });
      setCreditoData({ cantidad_cuotas: "", interes: "", fecha_limite: "" });
      setApartadoData({ cantidad_cuotas: "", fecha_limite: "" });
      setTotales({ totalVenta: 0, totalGanancia: 0, totalConInteres: 0 });
      fetchPrendas();

    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al registrar la venta" });
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  // ==============================================
  // JSX
  // ==============================================
  return (
    <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-700">Registrar Venta</h2>

      {/* MENSAJE */}
      {mensaje && (
        <div className={`mb-4 p-3 rounded text-center font-semibold
          ${mensaje.tipo === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* CLIENTE Y MÉTODO */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-1">Cliente</label>
          <input
            list="clientes"
            value={venta.clienteNombre}
            onChange={handleClienteSelect}
            className="border p-2 w-full rounded-md"
            placeholder="Escriba o seleccione un cliente"
          />
          <datalist id="clientes">
            {clientes.map(c => <option key={c.id} value={c.nombre} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Método de pago</label>
          <select
            name="metodo_pago"
            className="border p-2 w-full rounded-md"
            value={venta.metodo_pago}
            onChange={handleChange}
          >
            <option value="">Seleccione</option>
            {metodosPago.map(mp => (
              <option key={mp.id} value={mp.id}>{mp.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-600 mb-1">Descripción</label>
        <textarea
          className="border p-2 w-full rounded-md"
          rows="2"
          name="descripcion"
          value={venta.descripcion}
          onChange={handleChange}
        />
      </div>

      {/* CRÉDITO / APARTADO */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={venta.credito}
            onChange={e => setVenta({ ...venta, credito: e.target.checked, apartado: false })}
          />
          Venta a crédito
        </label>

        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={venta.apartado}
            onChange={e => setVenta({ ...venta, apartado: e.target.checked, credito: false })}
          />
          Venta con apartado
        </label>
      </div>

      {/* CONFIGURACIÓN DE CRÉDITO */}
      {venta.credito && (
        <div className="border p-4 rounded bg-gray-50 mb-6">
          <h4 className="font-semibold mb-3">Crédito</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label>Cantidad de cuotas</label>
              <input type="number" className="border w-full p-2 rounded"
                value={creditoData.cantidad_cuotas}
                onChange={e => setCreditoData({ ...creditoData, cantidad_cuotas: e.target.value })}
              />
            </div>

            <div>
              <label>Interés (%)</label>
              <input type="number" className="border w-full p-2 rounded"
                value={creditoData.interes}
                onChange={e => {
                  setCreditoData({ ...creditoData, interes: e.target.value });
                  calcularTotales(venta.prendas);
                }}
              />
            </div>

            <div>
              <label>Fecha límite</label>
              <input type="date" className="border w-full p-2 rounded"
                value={creditoData.fecha_limite}
                onChange={e => setCreditoData({ ...creditoData, fecha_limite: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Configuración de apartado */}
            {venta.apartado && (
            <div className="border p-4 rounded-lg bg-gray-50 mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">Configuración del Apartado</h4>
                <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm text-gray-600">Cantidad de cuotas</label>
                    <input
                    type="number"
                    min="1"
                    className="border p-2 rounded-md w-full"
                    value={apartadoData.cantidad_cuotas}
                    onChange={(e) =>
                        setApartadoData({ ...apartadoData, cantidad_cuotas: e.target.value })
                    }
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-600">Fecha límite</label>
                    <input
                    type="date"
                    className="border p-2 rounded-md w-full"
                    value={apartadoData.fecha_limite}
                    onChange={(e) => setApartadoData({ ...apartadoData, fecha_limite: e.target.value })}
                    />
                </div>
                </div>
            </div>
            )}

      {/* PRENDAS */}
      <h3 className="text-lg font-semibold mb-2">Prendas</h3>

      {venta.prendas.map((p, i) => (
        <div key={i} className="border p-4 rounded-lg mb-4 bg-gray-50">
          <div className="grid grid-cols-6 gap-2 items-end">

            <div className="col-span-2">
              <label className="block text-xs font-semibold">Prenda</label>
              <input
                list="prendas"
                className="border p-2 rounded w-full"
                value={p.nombre}
                onChange={e => handlePrendaChange(i, "nombre", e.target.value)}
              />
              <datalist id="prendas">
                {prendas.map(pr => <option key={pr.id} value={pr.nombre} />)}
              </datalist>
            </div>

            <div>
              <label>Peso (g)</label>
              <input className="border p-2 w-full bg-gray-100 rounded" readOnly value={p.gramos ?? ""} />
            </div>

            <div>
              <label>Material</label>
              <input className="border p-2 w-full bg-gray-100 rounded" readOnly value={p.material ?? ""} />
            </div>

            <div>
              <label>Cantidad</label>
              <input type="number" className="border p-2 w-full rounded"
                value={p.cantidad}
                onChange={e => handlePrendaChange(i, "cantidad", e.target.value)}
              />
            </div>

            <div>
              <label>Precio/gramo</label>
              <input type="number" className="border p-2 w-full rounded"
                value={p.precio_por_gramo}
                onChange={e => handlePrendaChange(i, "precio_por_gramo", e.target.value)}
              />
            </div>

            <div>
              <label>Ganancia/gramo</label>
              <input type="number" className="border p-2 w-full rounded"
                value={p.gramo_ganancia}
                onChange={e => handlePrendaChange(i, "gramo_ganancia", e.target.value)}
              />
            </div>

            <button className="text-red-600 font-semibold" onClick={() => handleRemovePrenda(i)}>
              Eliminar
            </button>
          </div>

          {p.nombre && (
            <p className="text-xs text-gray-500 mt-1">
              Existencia disponible: {p.existencia ?? "—"}
            </p>
          )}
        </div>
      ))}

      <button onClick={handleAddPrenda} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">
        + Agregar prenda
      </button>

      {/* TOTALES */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-2">Totales</h3>
        <p><strong>Total venta:</strong> ${totales.totalVenta.toFixed(2)}</p>
        <p><strong>Ganancia total:</strong> ${totales.totalGanancia.toFixed(2)}</p>

        <p className="mt-2 text-lg text-green-700 font-bold flex items-center gap-2">
          <FaMoneyBillWave size={18} />
          Subtotal final: ${(totales.totalVenta + totales.totalGanancia).toFixed(2)}
        </p>

        {venta.credito && (
          <p className="text-purple-700 font-bold mt-2">
            Total con interés ({creditoData.interes}%): ${totales.totalConInteres.toFixed(2)}
          </p>
        )}
      </div>

      {/* BOTONES */}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={() => window.location.reload()} className="bg-gray-400 text-white px-4 py-2 rounded">
          Cancelar
        </button>

        <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded">
          Guardar venta
        </button>
      </div>

    </div>
  );
};

export default VentaForm;
