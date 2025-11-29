import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaMoneyBillWave } from "react-icons/fa";
import { apiUrl } from "../config/api";

const EgresosForm = () => {
  // Formato de moneda colombiana
  const formatCurrency = (value) => {
    const num = Number(value || 0);
    try {
      return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } catch (e) {
      return `$${num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
  };

  const [metodosPago, setMetodosPago] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [methodQuery, setMethodQuery] = useState("");
  const [showMethodList, setShowMethodList] = useState(false);

  const [egreso, setEgreso] = useState({
    monto: "",
    metodo_pago: "",
    descripcion: "",
  });

  // ==============================================
  // CARGAR DATOS INICIALES
  // ==============================================
  useEffect(() => {
    fetchMetodosPago();
  }, []);

  const fetchMetodosPago = async () => {
    const res = await axios.get(apiUrl("/dominios_comunes/metodos-pago/"));
    setMetodosPago(res.data);
  };

  // ==============================================
  // MANEJO DE FORMULARIO
  // ==============================================
  const handleChange = (e) => {
    setEgreso({ ...egreso, [e.target.name]: e.target.value });
  };

  const handleMetodoSelect = (metodo) => {
    setEgreso({ ...egreso, metodo_pago: metodo.id });
    setMethodQuery(metodo.nombre);
    setShowMethodList(false);
  };

  // ==============================================
  // SUBMIT (Crear egreso)
  // ==============================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // VALIDAR CAMPOS REQUERIDOS
      if (!egreso.monto || egreso.monto <= 0) {
        setMensaje({ tipo: "error", texto: "Ingrese un monto válido" });
        setTimeout(() => setMensaje(null), 3000);
        return;
      }

      if (!egreso.metodo_pago) {
        setMensaje({ tipo: "error", texto: "Seleccione un método de pago" });
        setTimeout(() => setMensaje(null), 3000);
        return;
      }

      // CREAR EGRESO
      await axios.post(apiUrl("/egreso_ingreso/egresos/"), {
        monto: Number(egreso.monto),
        metodo_pago: egreso.metodo_pago,
        descripcion: egreso.descripcion,
      });

      // MENSAJE DE ÉXITO
      setMensaje({ tipo: "success", texto: "Egreso registrado correctamente" });
      setTimeout(() => setMensaje(null), 3000);

      // RESET
      setEgreso({
        monto: "",
        metodo_pago: "",
        descripcion: "",
      });
      setMethodQuery("");
    } catch (err) {
      console.error(err);
      setMensaje({ 
        tipo: "error", 
        texto: err.response?.data?.detail || "Error al registrar el egreso" 
      });
      setTimeout(() => setMensaje(null), 4000);
    }
  };

  // ==============================================
  // JSX
  // ==============================================
  return (
    <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <FaMoneyBillWave size={28} className="text-red-600" />
        <h2 className="text-2xl font-bold text-gray-700">Registrar Egreso</h2>
      </div>

      {/* MENSAJE */}
      {mensaje && (
        <div className={`mb-4 p-3 rounded text-center font-semibold
          ${mensaje.tipo === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* MONTO */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Monto <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            name="monto"
            step="0.01"
            min="0"
            value={egreso.monto}
            onChange={handleChange}
            placeholder="Ingrese el monto a retirar"
            className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* MÉTODO DE PAGO */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Método de pago <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={methodQuery}
            onChange={(e) => { setMethodQuery(e.target.value); setShowMethodList(true); }}
            onFocus={() => setShowMethodList(true)}
            onBlur={() => setTimeout(() => setShowMethodList(false), 150)}
            placeholder="Escriba o seleccione un método de pago"
            className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {showMethodList && (
            <div className="absolute z-20 left-0 right-0 bg-white border rounded shadow max-h-48 overflow-y-scroll mt-1">
              {metodosPago.filter(m => m.nombre.toLowerCase().includes((methodQuery || '').toLowerCase())).map(m => (
                <div
                  key={m.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onMouseDown={() => handleMetodoSelect(m)}
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

        {/* DESCRIPCIÓN */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={egreso.descripcion}
            onChange={handleChange}
            placeholder="Indique el motivo del egreso (opcional)"
            rows="3"
            className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* RESUMEN */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Monto a retirar:</strong>
          </p>
          <p className="text-2xl font-bold text-red-600 flex items-center gap-2 mt-1">
            <FaMoneyBillWave size={24} />
            {formatCurrency(egreso.monto)}
          </p>
        </div>

        {/* BOTONES */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              setEgreso({ monto: "", metodo_pago: "", descripcion: "" });
              setMethodQuery("");
              setMensaje(null);
            }}
            className="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-md transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-semibold transition-colors"
          >
            Registrar Egreso
          </button>
        </div>
      </form>
    </div>
  );
};

export default EgresosForm;
