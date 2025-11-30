import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaMoneyBillWave } from "react-icons/fa";
import { apiUrl } from "../config/api";
import ClientModal from "../Components/ClientModal";
import "../css/VentaForm.css";


//const BASE_URL = "http://127.0.0.1:8000/api/";

const VentaForm = () => {
  // Helpers de formato y parseo
  const formatNumber = (value, decimals = 2, locale = 'es-ES') => {
    const num = Number(value || 0);
    try {
      return num.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    } catch (e) {
      return num.toFixed(decimals);
    }
  };

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    try {
      return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      return `$${num.toFixed(2)}`;
    }
  };

  // Parse a number possibly typed with thousands separators/comma decimal
  const parseFormattedNumber = (str) => {
    if (str === null || str === undefined) return 0;
    if (typeof str === 'number') return str;
    // Remove currency symbol and spaces
    let s = String(str);
    // remove everything except digits, dots, commas and minus
    s = s.replace(/[^0-9,\.\-]/g, '');
    // If contains both dot and comma, assume dot=thousands, comma=decimal
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // Only commas -> treat comma as decimal separator
      if (s.indexOf(',') > -1 && s.indexOf('.') === -1) {
        s = s.replace(/,/g, '.');
      }
      // Only dots -> leave as is (dot decimal)
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  // Estados para autocompletes
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState(null);
  const [clientQuery, setClientQuery] = useState("");
  const [showClientList, setShowClientList] = useState(false);
  const [methodQuery, setMethodQuery] = useState("");
  const [showMethodList, setShowMethodList] = useState(false);
  const [showPrendaListIndex, setShowPrendaListIndex] = useState(null);
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
    descripcion: "",
  });

  const [apartadoData, setApartadoData] = useState({
    cantidad_cuotas: "",
    fecha_limite: "",
    descripcion: "",
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
  // Cliente: manejadores para listado filtrable
  const handleClienteInput = (e) => {
    const q = e.target.value;
    setClientQuery(q);
    setShowClientList(true);
    // keep typed name in venta but clienteId only set on selection
    setVenta({ ...venta, clienteNombre: q });
  };

  const handleClienteSelect = (cliente) => {
    setVenta({ ...venta, clienteNombre: cliente.nombre, clienteId: cliente.id });
    setClientQuery(cliente.nombre);
    setShowClientList(false);
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
    if (!updated[i]) updated[i] = { prendaId: "", nombre: "", cantidad: 0, precio_por_gramo: 0, gramo_ganancia: 0 };

    // Handle precio and ganancia as raw input strings while keeping numeric parsed value
    if (field === "precio_por_gramo") {
      updated[i].precio_input = value;
      updated[i].precio_por_gramo = parseFormattedNumber(value);
    } else if (field === "gramo_ganancia") {
      updated[i].ganancia_input = value;
      updated[i].gramo_ganancia = parseFormattedNumber(value);
    } else if (field === "nombre") {
      // selecting a prenda by name: fill defaults but preserve any user-edited inputs
      const prenda = prendas.find(p => p.nombre === value);
      updated[i].nombre = value;
      if (prenda) {
        const existing = updated[i] || {};
        updated[i] = {
          ...existing,
          nombre: prenda.nombre,
          prendaId: prenda.id,
          existencia: prenda.existencia,
          gramos: Number(prenda.gramos),
          material: prenda.tipo_oro_nombre,
          precio_por_gramo: existing.precio_por_gramo || Number(prenda.precio_por_gramo || 0),
          gramo_ganancia: existing.gramo_ganancia || Number(prenda.gramo_ganancia || 0),
          precio_input: existing.precio_input ?? (prenda.precio_por_gramo ? String(prenda.precio_por_gramo) : ''),
          ganancia_input: existing.ganancia_input ?? (prenda.gramo_ganancia ? String(prenda.gramo_ganancia) : ''),
        };
      }
    } else {
      updated[i][field] = value;
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
           descripcion: creditoData.descripcion,
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
      setCreditoData({ cantidad_cuotas: "", interes: "", fecha_limite: "", descripcion: "" });
      setApartadoData({ cantidad_cuotas: "", fecha_limite: "", descripcion: "" });
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
    <div className="max-w-5xl mx-auto venta-card">
      <h2 className="venta-title">Registrar Venta</h2>

      {/* MENSAJE */}
      {mensaje && (
        <div className={`mb-4 p-3 rounded text-center font-semibold
          ${mensaje.tipo === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* CLIENTE Y MÉTODO */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <label className="block text-sm font-semibold mb-1">Cliente</label>
           <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={clientQuery || venta.clienteNombre}
                  onChange={handleClienteInput}
                  onFocus={() => setShowClientList(true)}
                  onBlur={() => setTimeout(() => setShowClientList(false), 150)}
                  className="border p-2 w-full rounded-md"
                  placeholder="Escriba o seleccione un cliente"
                />

                {/* BOTÓN + */}
                <button
                  onClick={() => setShowClientModal(true)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-3 rounded-md h-full"
                >
                  +
                </button>
              </div>

          

          {showClientList && (
            <div className="absolute z-20 left-0 right-0 autocomplete-box mt-1">
              {clientes.filter(c => c.nombre.toLowerCase().includes((clientQuery || '').toLowerCase())).map(c => (
                <div
                  key={c.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onMouseDown={() => handleClienteSelect(c)}
                >
                  {c.nombre}
                </div>
              ))}
              {clientes.filter(c => c.nombre.toLowerCase().includes((clientQuery || '').toLowerCase())).length === 0 && (
                <div className="p-2 text-sm text-gray-500">No hay coincidencias</div>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-semibold mb-1">Método de pago</label>
          <input
            type="text"
            value={methodQuery}
            onChange={(e) => { setMethodQuery(e.target.value); setShowMethodList(true); }}
            onFocus={() => setShowMethodList(true)}
            onBlur={() => setTimeout(() => setShowMethodList(false), 150)}
            className="border p-2 w-full rounded-md"
            placeholder="Escriba o seleccione un método de pago"
          />
          {showMethodList && (
            <div className="absolute z-20 left-0 right-0 autocomplete-box mt-1">
              {metodosPago.filter(m => m.nombre.toLowerCase().includes((methodQuery || '').toLowerCase())).map(m => (
                <div
                  key={m.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onMouseDown={() => { setVenta({ ...venta, metodo_pago: m.id }); setMethodQuery(m.nombre); setShowMethodList(false); }}
                >
                  {m.nombre}
                </div>
              ))}
              {metodosPago.filter(m => m.nombre.toLowerCase().includes((methodQuery || '').toLowerCase())).length === 0 && (
                <div className="p-2 text-sm text-gray-500">No hay coincidencias</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-600 mb-1">Descripción</label>
        <textarea 
          className="input-modern"
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
        <div className="prenda-card mb-4">
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
          <div className="mt-4">
            <label className="block text-sm font-semibold mb-1">Descripción del crédito</label>
            <textarea 
            className="input-modern"
              rows="2"
              value={creditoData.descripcion}
              onChange={e => setCreditoData({ ...creditoData, descripcion: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* 🔹 Configuración de apartado */}
            {venta.apartado && (
            <div className="prenda-card mb-4">
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
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-1">Descripción del apartado</label>
                  <textarea 
                  className="input-modern"
                    rows="2"
                    value={apartadoData.descripcion}
                    onChange={(e) => setApartadoData({ ...apartadoData, descripcion: e.target.value })}
                  />
                </div>
            </div>
            )}

      {/* PRENDAS */}
      <h3 className="text-lg font-semibold mb-2">Prendas</h3>

      {venta.prendas.map((p, i) => (
        <div key={i} className="prenda-row">
  <div className="grid grid-cols-6 gap-3 items-end">

    <div className="col-span-2 relative">
      <label className="label-mini">Prenda</label>
      <input
        type="text"
        className="input-modern"
        value={p.nombre}
        onChange={e => handlePrendaChange(i, "nombre", e.target.value)}
        onFocus={() => setShowPrendaListIndex(i)}
        onBlur={() => setTimeout(() => setShowPrendaListIndex(null), 150)}
      />

      {showPrendaListIndex === i && (
        <div className="autocomplete-box absolute z-30 left-0 right-0 bg-white border rounded shadow max-h-48 overflow-y-scroll mt-1">
          {prendas
            .filter(pr => pr.nombre.toLowerCase().includes((p.nombre || "").toLowerCase()))
            .map(pr => (
              <div
                key={pr.id}
                className="autocomplete-item"
                onMouseDown={() => handlePrendaChange(i, "nombre", pr.nombre)}
              >
                <div className="font-medium">{pr.nombre}</div>
                <div className="text-xs text-gray-500">
                  {pr.tipo_oro_nombre} • {formatNumber(pr.gramos, 2)} g
                </div>
              </div>
            ))}
        </div>
      )}
    </div>

    <div>
      <label className="label-mini">Peso (g)</label>
      <input
        className="input-readonly"
        readOnly
        value={p.gramos ? `${formatNumber(p.gramos, 2)}g` : ""}
      />
    </div>

    <div>
      <label className="label-mini">Material</label>
      <input
        className="input-readonly"
        readOnly
        value={p.material ?? ""}
      />
    </div>

    <div>
      <label className="label-mini">Cantidad</label>
      <input
        type="number"
        className="input-modern"
        value={p.cantidad}
        onChange={e => handlePrendaChange(i, "cantidad", e.target.value)}
      />
    </div>

    <div>
      <label className="label-mini">Precio/gramo</label>
      <input
        type="text"
        className="input-modern"
        value={p.precio_input ?? "0"}
        onChange={e => handlePrendaChange(i, "precio_por_gramo", e.target.value)}
      />
    </div>

    <div>
              <label className="label-mini" >Ganancia/gramo</label>
              <input type="text" className="input-modern"
                value={p.ganancia_input !== undefined ? p.ganancia_input : (p.gramo_ganancia ?? '0,1')}
                onChange={e => handlePrendaChange(i, "gramo_ganancia", e.target.value)}
              />
          </div>

    <button className="btn-delete" onClick={() => handleRemovePrenda(i)}>
      ✕
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
      <div className="prenda-card mb-4">
        <h3 className="text-lg font-semibold mb-2">Totales</h3>
        <div className="totales-container">

        <div className="total-card purple">
          <p className="total-title">Total Venta</p>
          <p className="total-value">{formatCurrency(totales.totalVenta)}</p>
        </div>

        <div className="total-card green">
          <p className="total-title">Ganancia Total</p>
          <p className="total-value">{formatCurrency(totales.totalGanancia)}</p>
        </div>

        <div className="total-card blue">
          <p className="total-title">Subtotal Final</p>
          <p className="total-value">{formatCurrency(totales.totalVenta + totales.totalGanancia)}</p>
        </div>

        {venta.credito && (
          <div className="total-card yellow">
            <p className="total-title">Total con interés</p>
            <p className="total-value">
              {formatCurrency(totales.totalConInteres)}
            </p>
          </div>
        )}

      </div>
      </div>

      {/* BOTONES */}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={() => window.location.reload()}  className="btn-gray">
          Cancelar
        </button>

        <button onClick={handleSubmit} className="btn-green">
          Guardar venta
        </button>
      </div>
        


        {/* MODAL DE CLIENTE ⬇⬇⬇ */}
        {showClientModal && (
          <ClientModal
            cliente={{}}
            isCreating={true}
            onClose={() => setShowClientModal(false)}
            onSave={(nuevoCliente) => {
              setClientes((prev) => [...prev, nuevoCliente]);
              setVenta({
                ...venta,
                clienteId: nuevoCliente.id,
                clienteNombre: nuevoCliente.nombre,
              });
              setClientQuery(nuevoCliente.nombre);
              setShowClientModal(false);
            }}
          />
        )}
        
    </div>
  );

  
};



export default VentaForm;
