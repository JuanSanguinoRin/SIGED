import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaMoneyBillWave } from "react-icons/fa";
import { apiUrl } from "../config/api";

const IngresosForm = () => {
  const [metodosPago, setMetodosPago] = useState([]);
  const [mensaje, setMensaje] = useState(null);

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
      if (!ingreso.monto || ingreso.monto <= 0) {
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
        monto: Number(ingreso.monto),
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
            type="number"
            name="monto"
            step="0.01"
            min="0"
            value={ingreso.monto}
            onChange={handleChange}
            placeholder="Ingrese el monto recibido"
            className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Método de pago <span className="text-red-600">*</span>
          </label>
          <select
            name="metodo_pago"
            value={ingreso.metodo_pago}
            onChange={handleChange}
            className="border border-gray-300 p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Seleccione un método</option>
            {metodosPago.map(mp => (
              <option key={mp.id} value={mp.id}>{mp.nombre}</option>
            ))}
          </select>
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
            ${Number(ingreso.monto || 0).toFixed(2)}
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
