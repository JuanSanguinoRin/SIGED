import React, { useState, useEffect } from "react";

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

  const BASE_URL = "http://127.0.0.1:8000/api/";

  // --- Cargar datos iniciales ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [provRes, metRes, preRes] = await Promise.all([
          fetch(`${BASE_URL}terceros/proveedores/`),
          fetch(`${BASE_URL}dominios_comunes/metodos-pago/`),
          fetch(`${BASE_URL}prendas/prendas/`),
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
      const response = await fetch(`${BASE_URL}compra_venta/compras/`, {
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
                      <select
                        className="w-full border rounded p-1"
                        value={item.prenda}
                        onChange={(e) =>
                          handleItemChange(index, "prenda", e.target.value)
                        }
                        required
                      >
                        <option value="">Seleccione</option>
                        {prendas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.tipo_oro_nombre})
                          </option>
                        ))}
                      </select>
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
    </div>
  );
};

export default CompraForm;
