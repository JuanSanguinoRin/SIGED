import React, { useState, useEffect } from "react";
import ModalAgregarProducto from "../Components/ModalAgregarProducto";
import { apiUrl } from "../config/api";


const CompraForm = () => {
  const [proveedores, setProveedores] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [prendas, setPrendas] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState("");
  const [selectedMetodoPago, setSelectedMetodoPago] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [items, setItems] = useState([
    { prenda: "", cantidad: 1, precio_por_gramo: 0 },
  ]);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarModalPrenda, setMostrarModalPrenda] = useState(false);

  const [esCredito, setEsCredito] = useState(false);
  const [creditoData, setCreditoData] = useState({
    cantidad_cuotas: "",
    interes: "",
    estado: 4, // En proceso por defecto
    fecha_limite: "",
  });

  // --- Cargar datos iniciales ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [provRes, metRes, preRes] = await Promise.all([
          fetch(apiUrl("terceros/proveedores/")),
          fetch(apiUrl("dominios_comunes/metodos-pago/")),
          fetch(apiUrl("prendas/prendas/")),
        ]);
        const [prov, met, pre] = await Promise.all([
          provRes.json(),
          metRes.json(),
          preRes.json(),
        ]);
        setProveedores(prov);
        setMetodosPago(met);
        setPrendas(pre);
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };
    fetchData();
  }, []);

  // --- Calcular totales ---
  const calcularSubtotal = (item) => {
    const prendaSeleccionada = prendas.find((p) => p.id === parseInt(item.prenda));
    if (!prendaSeleccionada) return 0;
    const gramosTotales = parseFloat(prendaSeleccionada.gramos || 0) * item.cantidad;
    const subtotal = gramosTotales * parseFloat(item.precio_por_gramo || 0);
    return subtotal;
  };

  const totalCompra = items.reduce(
    (acc, item) => acc + calcularSubtotal(item),
    0
  );

  // --- Manejar cambios de los items ---
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { prenda: "", cantidad: 1, precio_por_gramo: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- Enviar compra al backend ---
  const handleSubmit = async (e) => {
  e.preventDefault();

  const payload = {
    proveedor: selectedProveedor,
    metodo_pago: selectedMetodoPago,
    descripcion,
    prendas: items.map((item) => ({
      prenda: parseInt(item.prenda),
      cantidad: parseInt(item.cantidad),
      precio_por_gramo: parseFloat(item.precio_por_gramo),
    })),
  };

  try {
    // 🔹 Si es crédito, crear el crédito primero
    if (esCredito) {
      const creditoRes = await fetch(apiUrl("apartado_credito/creditos/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cantidad_cuotas: Number(creditoData.cantidad_cuotas),
          cuotas_pendientes: Number(creditoData.cantidad_cuotas),
          interes: Number(creditoData.interes),
          estado: 4,
          fecha_limite: creditoData.fecha_limite,
        }),
      });

      if (!creditoRes.ok) throw new Error("Error creando crédito");
      const credito = await creditoRes.json();
      payload.credito = credito.id;
    }

    // 🔹 Crear la compra
    const response = await fetch(apiUrl("compra_venta/compras/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error:", errorData);
      throw new Error("Error al registrar la compra");
    }

    setMensaje("✅ Compra registrada correctamente");
    setSelectedProveedor("");
    setSelectedMetodoPago("");
    setDescripcion("");
    setItems([{ prenda: "", cantidad: 1, precio_por_gramo: 0 }]);
    setEsCredito(false);
    setCreditoData({ cantidad_cuotas: "", interes: "", estado: 4, fecha_limite: "" });

  } catch (error) {
    setMensaje("❌ Error al registrar la compra");
    console.error(error);
  }
};


  return (
    <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 mt-10">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Registrar Compra</h2>

      {mensaje && (
        <div
          className={`mb-4 p-3 rounded ${
            mensaje.includes("✅")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {mensaje}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de proveedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor:
          </label>
          <select
            className="w-full border rounded-lg p-2"
            value={selectedProveedor}
            onChange={(e) => setSelectedProveedor(e.target.value)}
            required
          >
            <option value="">Seleccione un proveedor</option>
            {proveedores.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de pago:
          </label>
          <select
            className="w-full border rounded-lg p-2"
            value={selectedMetodoPago}
            onChange={(e) => setSelectedMetodoPago(e.target.value)}
            required
          >
            <option value="">Seleccione un método de pago</option>
            {metodosPago.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción:
          </label>
          <textarea
            className="w-full border rounded-lg p-2"
            rows="2"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          ></textarea>
        </div>

        {/* Compra a crédito */}
        <div className="mb-6">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={esCredito}
              onChange={(e) => setEsCredito(e.target.checked)}
            />
            Compra a crédito
          </label>
        </div>

        {/* Configuración del crédito */}
        {esCredito && (
          <div className="border p-4 rounded-lg bg-gray-50 mb-6">
            <h4 className="font-semibold text-gray-700 mb-3">Configuración del Crédito</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600">Cantidad de cuotas</label>
                <input
                  type="number"
                  min="1"
                  className="border p-2 rounded-md w-full"
                  value={creditoData.cantidad_cuotas}
                  onChange={(e) =>
                    setCreditoData({ ...creditoData, cantidad_cuotas: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">Interés (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="border p-2 rounded-md w-full"
                  placeholder="Ej: 2.5"
                  value={creditoData.interes}
                  onChange={(e) =>
                    setCreditoData({ ...creditoData, interes: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">Estado</label>
                <input
                  type="text"
                  className="border p-2 rounded-md w-full bg-gray-100 cursor-not-allowed"
                  value="En proceso"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600">Fecha límite</label>
                <input
                  type="date"
                  className="border p-2 rounded-md w-full"
                  value={creditoData.fecha_limite}
                  onChange={(e) =>
                    setCreditoData({ ...creditoData, fecha_limite: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabla de prendas */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-gray-800">
            Detalle de Prendas
          </h3>
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Prenda</th>
                <th className="p-2 border">Cantidad</th>
                <th className="p-2 border">Precio por gramo</th>
                <th className="p-2 border">Subtotal</th>
                <th className="p-2 border"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const subtotal = calcularSubtotal(item).toFixed(2);
                return (
                  <tr key={index}>
                    <td className="border p-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 border rounded p-1"
                          value={item.prenda}
                          onChange={(e) => handleItemChange(index, "prenda", e.target.value)}
                          required
                        >
                          <option value="">Seleccione</option>
                          {prendas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.tipo_oro_nombre})
                            </option>
                          ))}
                        </select>

                        {/* 🔹 Botón + */}
                        <button
                          type="button"
                          onClick={() => setMostrarModalPrenda(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded-full text-lg leading-none"
                          title="Agregar nueva prenda"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        min="1"
                        className="w-20 border rounded p-1"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleItemChange(index, "cantidad", e.target.value)
                        }
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        step="0.01"
                        className="w-28 border rounded p-1"
                        value={item.precio_por_gramo}
                        onChange={(e) =>
                          handleItemChange(index, "precio_por_gramo", e.target.value)
                        }
                      />
                    </td>
                    <td className="border p-2 text-center">{subtotal}</td>
                    <td className="border p-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-lg"
          >
            + Agregar Prenda
          </button>
        </div>

        {/* Totales */}
        <div className="text-right mt-4">
          <p className="text-lg font-semibold text-gray-800">
            Total de la compra: ${totalCompra.toFixed(2)}
          </p>
        </div>

        {/* Botón de guardar */}
        <div className="text-center">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Registrar Compra
          </button>
        </div>
      </form>
        {mostrarModalPrenda && (
          <ModalAgregarProducto
            onClose={() => setMostrarModalPrenda(false)}
            onAdd={(nuevaPrenda) => {
              // 🔹 Agregar la nueva prenda al listado actual
              setPrendas((prev) => [...prev, nuevaPrenda]);

              // 🔹 Actualizar automáticamente el select del último item
              setItems((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                updated[lastIndex].prenda = nuevaPrenda.id;
                return updated;
              });

              // 🔹 Cerrar el modal
              setMostrarModalPrenda(false);
            }}
          />
        )}



    </div>
  );
};

export default CompraForm;