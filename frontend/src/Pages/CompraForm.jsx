import React, { useState, useEffect } from "react";
import ModalAgregarProducto from "../Components/ModalAgregarProducto";
import { apiUrl } from "../config/api";
import ProveedorModal from "../Components/ProveedorModal";
import "../css/CompraForm.css";



const CompraForm = () => {
  // Formato de moneda colombiana
  const formatCurrency = (value) => {
    const num = Number(value || 0);
    try {
      return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } catch (e) {
      return `$${num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
    }
  };

  const [proveedores, setProveedores] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [prendas, setPrendas] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState("");
  const [selectedMetodoPago, setSelectedMetodoPago] = useState("");
  const [proveedorQuery, setProveedorQuery] = useState("");
  const [showProveedorList, setShowProveedorList] = useState(false);
  const [methodQuery, setMethodQuery] = useState("");
  const [showMethodList, setShowMethodList] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [items, setItems] = useState([
    { prenda: "", cantidad: 1, precio_por_gramo: 0 },
  ]);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarModalPrenda, setMostrarModalPrenda] = useState(false);
  const [showPrendaListIndex, setShowPrendaListIndex] = useState(null);

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

  const handleProveedorSelect = (proveedor) => {
    setSelectedProveedor(proveedor.id);
    setProveedorQuery(proveedor.nombre);
    setShowProveedorList(false);
  };

  const handleMetodoSelect = (metodo) => {
    setSelectedMetodoPago(metodo.id);
    setMethodQuery(metodo.nombre);
    setShowMethodList(false);
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
    setProveedorQuery("");
    setSelectedMetodoPago("");
    setMethodQuery("");
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
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor:
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={proveedorQuery}
              onChange={(e) => { setProveedorQuery(e.target.value); setShowProveedorList(true); }}
              onFocus={() => setShowProveedorList(true)}
              onBlur={() => setTimeout(() => setShowProveedorList(false), 150)}
              placeholder="Escriba o seleccione un proveedor"
              className="w-full border rounded-lg p-2"
              required
            />

            {/* 🔥 Botón para abrir modal */}
            <button
              type="button"
              onClick={() => setShowProveedorModal(true)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-3 rounded-md"
            >
              +
            </button>
          </div>


          {showProveedorList && (
            <div className="absolute z-20 left-0 right-0 bg-white border rounded shadow max-h-48 overflow-y-scroll mt-1">
              {proveedores.filter(p => p.nombre.toLowerCase().includes((proveedorQuery || '').toLowerCase())).map(prov => (
                <div
                  key={prov.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onMouseDown={() => handleProveedorSelect(prov)}
                >
                  {prov.nombre}
                </div>
              ))}
              {proveedores.filter(p => p.nombre.toLowerCase().includes((proveedorQuery || '').toLowerCase())).length === 0 && (
                <div className="p-2 text-sm text-gray-500">No hay coincidencias</div>
              )}
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de pago:
          </label>
          <input
            type="text"
            value={methodQuery}
            onChange={(e) => { setMethodQuery(e.target.value); setShowMethodList(true); }}
            onFocus={() => setShowMethodList(true)}
            onBlur={() => setTimeout(() => setShowMethodList(false), 150)}
            placeholder="Escriba o seleccione un método de pago"
            className="w-full border rounded-lg p-2"
            required
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

       {/* DETALLE DE PRENDAS - DISEÑO MODERNO */}
<div className="mt-6">
  <h3 className="text-xl font-bold text-gray-800 mb-3">Detalle de Prendas</h3>

  {items.map((item, index) => {
    const prendaSelec = prendas.find(p => p.id === Number(item.prenda));
    const subtotal = calcularSubtotal(item);

    return (
      <div key={index} className="prenda-row">
        <div className="grid grid-cols-6 gap-3 items-end">

          {/* 🔮 Prenda */}
          <div className="col-span-2">
            <label className="label-mini">Prenda</label>

            <div className="flex items-center gap-2">
              {/* Input de búsqueda */}
              <div className="relative flex-1">
                <input
                  type="text"
                  className="input-modern"
                  value={item.prendaQuery !== undefined ? item.prendaQuery : ""}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[index].prendaQuery = e.target.value;
                    setItems(updated);
                    setShowPrendaListIndex(index);
                  }}
                  onFocus={() => setShowPrendaListIndex(index)}
                  onBlur={() => setTimeout(() => setShowPrendaListIndex(null), 150)}
                  placeholder="Buscar prenda"
                />

                {/* Lista de autocompletar */}
                {showPrendaListIndex === index && (
                  <div className="autocomplete-box absolute z-30 left-0 right-0 bg-white border rounded shadow max-h-48 overflow-y-scroll mt-1">
                    {prendas
                      .filter(p => p.nombre.toLowerCase().includes((item.prendaQuery || "").toLowerCase()))
                      .map(p => (
                        <div
                          key={p.id}
                          className="autocomplete-item"
                          onMouseDown={() => {
                            const updated = [...items];
                            updated[index].prenda = p.id;
                            updated[index].prendaQuery = p.nombre;
                            setItems(updated);
                            setShowPrendaListIndex(null);
                          }}
                        >
                          <div className="font-medium">{p.nombre}</div>
                          <div className="text-xs text-gray-500">{p.tipo_oro_nombre}</div>
                        </div>
                      ))}

                    {prendas.filter(p =>
                      p.nombre.toLowerCase().includes((item.prendaQuery || "").toLowerCase())
                    ).length === 0 && (
                      <div className="p-2 text-sm text-gray-500">No hay coincidencias</div>
                    )}
                  </div>
                )}
              </div>

              {/* 🔹 Botón + (volvió, ajustado al estilo moderno) */}
              <button
                type="button"
                onClick={() => setMostrarModalPrenda(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-xl text-lg leading-none shadow"
                title="Agregar nueva prenda"
              >
                +
              </button>
            </div>
          </div>

          {/* Gramos de la prenda */}
          <div>
            <label className="label-mini">Gramos</label>
            <input
              className="input-readonly"
              readOnly
              value={prendaSelec?.gramos || ""}
            />
          </div>

          {/* Cantidad */}
          <div>
            <label className="label-mini">Cantidad</label>
            <input
              type="number"
              className="input-modern"
              min="1"
              value={item.cantidad}
              onChange={(e) => handleItemChange(index, "cantidad", e.target.value)}
            />
          </div>

          {/* Precio por gramo */}
          <div>
            <label className="label-mini">Precio/gramo</label>
            <input
              type="number"
              className="input-modern"
              value={item.precio_por_gramo}
              onChange={(e) =>
                handleItemChange(index, "precio_por_gramo", e.target.value)
              }
            />
          </div>

          {/* Subtotal */}
          <div>
            <label className="label-mini">Subtotal</label>
            <input
              className="input-readonly"
              readOnly
              value={formatCurrency(subtotal)}
            />
          </div>

          {/* Botón eliminar */}
          <button className="btn-delete" onClick={() => removeItem(index)}>
            ✕
          </button>
        </div>
      </div>
    );
  })}

  {/* Agregar prenda */}
  <button
    type="button"
    onClick={addItem}
    className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow"
  >
    + Agregar Prenda
  </button>
</div>

        {/* Totales */}
        <div className="totales-container mt-6">
          <div className="total-card purple">
            <p className="total-title">Total de la Compra</p>
            <p className="total-value">{formatCurrency(totalCompra)}</p>
          </div>
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

        {showProveedorModal && (
        <ProveedorModal
          onClose={() => setShowProveedorModal(false)}
          onSave={(nuevoProveedor) => {
            // 1. Agregar a la lista
            setProveedores((prev) => [...prev, nuevoProveedor]);

            // 2. Seleccionarlo automáticamente
            setSelectedProveedor(nuevoProveedor.id);
            setProveedorQuery(nuevoProveedor.nombre);

            // 3. Cerrar modal
            setShowProveedorModal(false);
          }}
        />
      )}

    </div>
  );
};

export default CompraForm;