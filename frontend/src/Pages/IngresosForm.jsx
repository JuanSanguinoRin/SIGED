import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaMoneyBillWave } from "react-icons/fa";
import { apiUrl } from "../config/api";

const IngresosForm = () => {
  const [metodosPago, setMetodosPago] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  // Helpers de formato/parseo
  const parseFormattedNumber = (str) => {
    if (str === null || str === undefined) return 0;
    if (typeof str === 'number') return str;
    let s = String(str);
    s = s.replace(/[^0-9,\.\-]/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else if (s.indexOf(',') > -1 && s.indexOf('.') === -1) {
      s = s.replace(/,/g, '.');
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    try {
      return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      return `$${num.toFixed(2)}`;
    }
  };

  const [methodQuery, setMethodQuery] = useState("");
  const [showMethodList, setShowMethodList] = useState(false);

  const [ingreso, setIngreso] = useState({
    monto: "",
    metodo_pago: "",
    descripcion: "",
  });

  useEffect(() => {
    fetchMetodosPago();
  }, []);

  const fetchMetodosPago = async () => {
    const res = await axios.get(apiUrl("/dominios_comunes/metodos-pago/"));
    setMetodosPago(res.data);
  };

  const handleChange = (e) => {
    setIngreso({ ...ingreso, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const montoNum = parseFormattedNumber(ingreso.monto);
      if (!montoNum || montoNum <= 0) {
        setMensaje({ tipo: "error", texto: "Ingrese un monto válido" });
        setTimeout(() => setMensaje(null), 3000);
        return;
      }

      if (!ingreso.metodo_pago) {
        setMensaje({ tipo: "error", texto: "Seleccione un método de pago" });
        setTimeout(() => setMensaje(null), 3000);
        return;
      }

      await axios.post(apiUrl("/egreso_ingreso/ingresos/"), {
        monto: montoNum,
        metodo_pago: ingreso.metodo_pago,
        descripcion: ingreso.descripcion,
      });

      setMensaje({ tipo: "success", texto: "Ingreso registrado correctamente" });
      setTimeout(() => setMensaje(null), 3000);

      setIngreso({
        monto: "",
        metodo_pago: "",
        descripcion: "",
      });
    } catch (err) {
      console.error(err);
      setMensaje({ 
        tipo: "error", 
        texto: err.response?.data?.detail || "Error al registrar el ingreso" 
      });
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <FaMoneyBillWave size={28} className="text-green-600" />
        <h2 className="text-2xl font-bold text-gray-700">Registrar Ingreso</h2>
      </div>

      {mensaje && (
        <div className={`mb-4 p-3 rounded text-center font-semibold
          ${mensaje.tipo === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Monto <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="monto"
            value={ingreso.monto}
            onChange={(e) => setIngreso({ ...ingreso, monto: e.target.value })}
            placeholder="Ingrese el monto recibido"
            className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Método de pago <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={methodQuery}
              onChange={(e) => { setMethodQuery(e.target.value); setShowMethodList(true); }}
              onFocus={() => setShowMethodList(true)}
              onBlur={() => setTimeout(() => setShowMethodList(false), 150)}
              placeholder="Escriba o seleccione un método"
              className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {showMethodList && (
              <div className="absolute left-0 right-0 z-20 bg-white border rounded shadow max-h-48 overflow-y-scroll mt-1">
                {metodosPago.filter(m => m.nombre.toLowerCase().includes((methodQuery || '').toLowerCase())).map(m => (
                  <div key={m.id} className="p-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => { setIngreso({ ...ingreso, metodo_pago: m.id }); setMethodQuery(m.nombre); setShowMethodList(false); }}>
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

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={ingreso.descripcion}
            onChange={handleChange}
            placeholder="Indique el motivo del ingreso (opcional)"
            rows="3"
            className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Monto recibido:</strong>
          </p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-2 mt-1">
            <FaMoneyBillWave size={24} />
            {formatCurrency(parseFormattedNumber(ingreso.monto))}
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              setIngreso({ monto: "", metodo_pago: "", descripcion: "" });
              setMensaje(null);
            }}
            className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-md transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-semibold transition-colors"
          >
            Registrar Ingreso
          </button>
        </div>
      </form>
    </div>
  );
};

export default IngresosForm;
