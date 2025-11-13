import React, { useState, useEffect } from "react";
import axios from "axios";

const VentaForm = () => {
    const [clientes, setClientes] = useState([]);
    const [prendas, setPrendas] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);

    const [venta, setVenta] = useState({
        clienteId: "",
        clienteNombre: "",
        descripcion: "",
        metodo_pago: "",
        prendas: [],
    });

    const [creditoData, setCreditoData] = useState({
        cantidad_cuotas: "",
        interes: "",
        estado: "",
        fecha_limite: "",
    });

    const [apartadoData, setApartadoData] = useState({
        cantidad_cuotas: "",
        estado: "",
        fecha_limite: "",
    });

    const [estados, setEstados] = useState([]);

    const [totales, setTotales] = useState({
        totalVenta: 0,
        totalGanancia: 0,
    });

    const [mensaje, setMensaje] = useState(null);


    // 🔹 Cargar datos iniciales
    useEffect(() => {
        fetchClientes();
        fetchPrendas();
        fetchMetodosPago();
        fetchEstados();
    }, []);

    const fetchClientes = async () => {
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/terceros/clientes/");
            setClientes(res.data);
        } catch (e) {
            console.error("Error cargando clientes", e);
        }
    };

    const fetchEstados = async () => {
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/dominios_comunes/estados/");
            setEstados(res.data);
        } catch (e) {
            console.error("Error cargando estados", e);
        }
    };

    const fetchPrendas = async () => {
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/prendas/prendas/");

            // Si la respuesta tiene paginación (res.data.results), úsala
            const data = Array.isArray(res.data) ? res.data : res.data.results;

            // Filtramos solo las que no estén archivadas y tengan existencia > 0
            setPrendas(data.filter((p) => !p.archivado && p.existencia > 0));
        } catch (e) {
            console.error("Error cargando prendas", e);
        }
    };

    const fetchMetodosPago = async () => {
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/dominios_comunes/metodos-pago/");
            setMetodosPago(res.data);
        } catch (e) {
            console.error("Error cargando métodos de pago", e);
        }
    };

    // 🔹 Manejar cambios del formulario
    const handleChange = (e) => {
        const { name, value } = e.target;
        setVenta({ ...venta, [name]: value });
    };

    // 🔹 Selección de cliente
    const handleClienteSelect = (e) => {
        const nombre = e.target.value;
        const cliente = clientes.find((c) => c.nombre === nombre);
        setVenta({ ...venta, clienteNombre: nombre, clienteId: cliente ? cliente.id : "" });
    };

    // 🔹 Agregar prenda
    const handleAddPrenda = () => {
        setVenta({
            ...venta,
            prendas: [
                ...venta.prendas,
                { prendaId: "", nombre: "", cantidad: 0, precio_por_gramo: 0, gramo_ganancia: 0 },
            ],
        });
    };

    // 🔹 Cambiar datos de una prenda
   const handlePrendaChange = (index, field, value) => {
    const updated = [...venta.prendas];
    updated[index][field] = value;

    // Si cambia el nombre de la prenda
    if (field === "nombre") {
        const prenda = prendas.find((p) => p.nombre === value);
        console.log("🟡 Prenda seleccionada:", prenda);

        if (prenda) {
            updated[index] = {
                ...updated[index],
                prendaId: prenda.id,
                existencia: prenda.existencia,
                gramos: parseFloat(prenda.gramos),
                material: prenda.tipo_oro_nombre,
            };
        }
    }
    setVenta({ ...venta, prendas: updated });
    calcularTotales(updated);
};

    // 🔹 Eliminar prenda
    const handleRemovePrenda = (index) => {
        const updated = [...venta.prendas];
        updated.splice(index, 1);
        setVenta({ ...venta, prendas: updated });
        calcularTotales(updated);
    };

    // 🔹 Calcular totales
    const calcularTotales = (prendas) => {
        let totalVenta = 0;
        let totalGanancia = 0;

        prendas.forEach((p) => {
            const cantidad = Number(p.cantidad || 0);           // cantidad vendida
            const precio = Number(p.precio_por_gramo || 0);     // precio por gramo
            const gananciaGramos = Number(p.gramo_ganancia || 0);
            const gramos = Number(p.gramos || 0);

            const totalPorPrenda = (gramos) * precio * cantidad;

            const gananciaPorPrenda = gananciaGramos * precio * cantidad;

            totalVenta += totalPorPrenda;
            totalGanancia += gananciaPorPrenda;
        });

        setTotales({ totalVenta, totalGanancia });
    };

// 🔹 Enviar formulario
const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar existencias
    for (const p of venta.prendas) {
        if (p.cantidad > p.existencia) {
            alert(`No hay suficiente existencia para "${p.nombre}". Disponible: ${p.existencia}`);
            return;
        }
    }

    try {
        let creditoId = null;
        let apartadoId = null;

        // 🟢 Si es una venta a crédito, primero creamos el crédito
        if (venta.credito) {
            const creditoRes = await axios.post(
                "http://127.0.0.1:8000/api/apartado_credito/creditos/",
                {
                    cantidad_cuotas: Number(creditoData.cantidad_cuotas),
                    cuotas_pendientes: Number(creditoData.cantidad_cuotas),
                    interes: Number(creditoData.interes),
                    estado: 4, // “En proceso”
                    fecha_limite: creditoData.fecha_limite,
                }
            );
            creditoId = creditoRes.data.id;
        }

        // 🟢 Si es una venta con apartado, primero creamos el apartado
        if (venta.apartado) {
            const apartadoRes = await axios.post(
                "http://127.0.0.1:8000/api/apartado_credito/apartados/",
                {
                    cantidad_cuotas: Number(apartadoData.cantidad_cuotas),
                    cuotas_pendientes: Number(apartadoData.cantidad_cuotas),
                    estado: 4, // “En proceso”
                    fecha_limite: apartadoData.fecha_limite,
                }
            );
            apartadoId = apartadoRes.data.id;
        }

        // 🟢 Crear la venta principal
        const response = await axios.post(
            "http://127.0.0.1:8000/api/compra_venta/ventas/",
            {
                cliente: venta.clienteId,
                descripcion: venta.descripcion,
                metodo_pago: venta.metodo_pago,
                credito: creditoId,
                apartado: apartadoId,
                prendas: venta.prendas.map((p) => ({
                    prenda: p.prendaId,
                    cantidad: Number(p.cantidad),
                    precio_por_gramo: Number(p.precio_por_gramo),
                    gramo_ganancia: Number(p.gramo_ganancia),
                })),
            }
        );

        // 🟢 Actualizar existencias de cada prenda vendida
        for (const p of venta.prendas) {
            const nuevaExistencia = p.existencia - p.cantidad;
            await axios.patch(`http://127.0.0.1:8000/api/prendas/prendas/${p.prendaId}/`, {
                existencia: nuevaExistencia,
            });
        }

        // 🟢 Mostrar mensaje visual tipo CompraForm
        setMensaje({
            tipo: "exito",
            texto: "✅ Venta registrada correctamente.",
        });

        // Resetear formulario
        setVenta({
            clienteId: "",
            clienteNombre: "",
            descripcion: "",
            metodo_pago: "",
            prendas: [],
            credito: null,
            apartado: null,
        });
        setCreditoData({ cantidad_cuotas: "", interes: "", estado: 4, fecha_limite: "" });
        setApartadoData({ cantidad_cuotas: "", estado: 4, fecha_limite: "" });
        setTotales({ totalVenta: 0, totalGanancia: 0 });
        fetchPrendas();

        // Ocultar mensaje automáticamente
        setTimeout(() => setMensaje(null), 3000);

    } catch (error) {
        console.error("Error al registrar venta:", error.response?.data || error.message);
        alert(
            "Error al registrar venta:\n" +
            JSON.stringify(error.response?.data || error.message, null, 2)
        );
    }
};

    return (
        <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">Registrar Venta</h2>
        {mensaje && (
            <div
                className={`mb-4 p-3 rounded font-medium text-center ${
                mensaje.tipo === "exito"
                    ? "bg-green-100 border border-green-300 text-green-700 shadow-sm"
                    : "bg-red-100 border border-red-300 text-red-700 shadow-sm"
                }`}
            >
                {mensaje.texto}
            </div>
            )}

            {/* CLIENTE Y MÉTODO DE PAGO */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Cliente</label>
                    <input
                        list="clientes"
                        type="text"
                        name="clienteNombre"
                        className="border p-2 w-full rounded-md"
                        placeholder="Escriba o seleccione un cliente"
                        value={venta.clienteNombre}
                        onChange={handleClienteSelect}
                    />
                    <datalist id="clientes">
                        {clientes.map((c) => (
                            <option key={c.id} value={c.nombre} />
                        ))}
                    </datalist>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Método de pago</label>
                    <select
                        name="metodo_pago"
                        className="border p-2 w-full rounded-md"
                        value={venta.metodo_pago}
                        onChange={handleChange}
                    >
                        <option value="">Seleccione</option>
                        {metodosPago.map((mp) => (
                            <option key={mp.id} value={mp.id}>
                                {mp.nombre}
                            </option>
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
                    placeholder="Detalles adicionales de la venta"
                />
            </div>

            {/*METODOS DE PAGO PUTA VIDA DE MIERDA */}
            {/* MÉTODOS DE PAGO */}
            <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
                <label className="inline-flex items-center">
                <input
                    type="checkbox"
                    className="mr-2"
                    checked={venta.credito || false}
                    onChange={(e) =>
                    setVenta({ ...venta, credito: e.target.checked ? true : null, apartado: null })
                    }
                />
                Venta a crédito
                </label>
            </div>

            <div>
                <label className="inline-flex items-center">
                <input
                    type="checkbox"
                    className="mr-2"
                    checked={venta.apartado || false}
                    onChange={(e) =>
                    setVenta({ ...venta, apartado: e.target.checked ? true : null, credito: null })
                    }
                />
                Venta con apartado
                </label>
            </div>

            <div>
                <p className="text-gray-500 text-sm mt-1">
                Si ambos están sin marcar, se considera <strong>venta inmediata</strong>.
                </p>
            </div>
            </div>

            {/* 🔹 Configuración de crédito */}
            {venta.credito && (
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
                    onChange={(e) => setCreditoData({ ...creditoData, interes: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-600">Fecha límite</label>
                    <input
                    type="date"
                    className="border p-2 rounded-md w-full"
                    value={creditoData.fecha_limite}
                    onChange={(e) => setCreditoData({ ...creditoData, fecha_limite: e.target.value })}
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
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Prendas</h3>
            {venta.prendas.map((p, index) => (
                <div key={index} className="border p-4 rounded-lg mb-4 bg-gray-50">
                    <div className="grid grid-cols-6 gap-2 items-end">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-600">Prenda</label>
                            <input
                                list="prendas"
                                type="text"
                                className="border p-2 rounded-md w-full"
                                placeholder="Escriba o seleccione una prenda"
                                value={p.nombre}
                                onChange={(e) => handlePrendaChange(index, "nombre", e.target.value)}
                            />
                            <datalist id="prendas">
                                {prendas.map((pr) => (
                                    <option key={pr.id} value={pr.nombre} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600">Peso (gramos)</label>
                            <input
                                type="number"
                                className="border p-2 rounded-md w-full bg-gray-100 cursor-not-allowed"
                                value={p.gramos || ""}
                                readOnly
                            />
                        </div>

                        {/* 🔹 Nuevo: Material */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600">Material</label>
                            <input
                                type="text"
                                className="border p-2 rounded-md w-full bg-gray-100 cursor-not-allowed"
                                value={p.material || ""}
                                readOnly
                            />
                        </div>


                        <div>
                            <label className="block text-xs font-semibold text-gray-600">Cantidad de producto</label>
                            <input
                                type="number"
                                className="border p-2 rounded-md w-full"
                                value={p.cantidad}
                                onChange={(e) => handlePrendaChange(index, "cantidad", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600">Precio/gramo</label>
                            <input
                                type="number"
                                className="border p-2 rounded-md w-full"
                                value={p.precio_por_gramo}
                                onChange={(e) => handlePrendaChange(index, "precio_por_gramo", e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600">Ganancia/gramo</label>
                            <input
                                type="number"
                                className="border p-2 rounded-md w-full"
                                value={p.gramo_ganancia}
                                onChange={(e) => handlePrendaChange(index, "gramo_ganancia", e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="button"
                                className="text-red-600 font-semibold"
                                onClick={() => handleRemovePrenda(index)}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                    {p.nombre && (
                        <p className="text-sm text-gray-500 mt-1">
                            Existencia disponible: {p.existencia ?? "—"}
                        </p>
                    )}
                </div>
            ))}

            <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4"
                onClick={handleAddPrenda}
            >
                + Agregar prenda
            </button>



            {/* TOTALES */}
            <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-2 text-gray-700">Totales</h3>
                <p><strong>Total venta:</strong> ${totales.totalVenta.toFixed(2)}</p>
                <p><strong>Ganancia total:</strong> ${totales.totalGanancia.toFixed(2)}</p>
                <p className="mt-2 text-lg text-green-700 font-bold">
                    💰 Total final: ${(totales.totalVenta + totales.totalGanancia).toFixed(2)}
                </p>
            </div>

            {/* BOTONES */}
            <div className="mt-6 flex justify-end gap-3">
                <button
                    type="button"
                    className="bg-gray-400 text-white px-4 py-2 rounded-md"
                    onClick={() => window.location.reload()}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    onClick={handleSubmit}
                    className="bg-green-600 text-white px-4 py-2 rounded-md"
                >
                    Guardar venta
                </button>
            </div>
        </div>
    );
};

export default VentaForm;
