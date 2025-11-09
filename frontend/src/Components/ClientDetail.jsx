import React from "react";
import { FaPhone, FaEnvelope, FaIdCard, FaMapMarkerAlt } from "react-icons/fa";

const ClientDetail = ({ cliente, historial }) => {
  if (!cliente) {
    return (
      <div className="p-6 text-gray-500 italic">
        Selecciona un cliente para ver los detalles.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 w-full">
      {/* Encabezado */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Detalles del Cliente
      </h2>

      {/* Información personal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-gray-600 flex items-center gap-2">
            <FaIdCard className="text-purple-600" />
            <span className="font-medium">Cédula:</span> {cliente.cedula}
          </p>
          <p className="text-gray-600 flex items-center gap-2 mt-2">
            <FaPhone className="text-purple-600" />
            <span className="font-medium">Teléfono:</span>
            {cliente.telefono || "No registrado"}
          </p>
          <p className="text-gray-600 flex items-center gap-2 mt-2">
            <FaEnvelope className="text-purple-600" />
            <span className="font-medium">Correo:</span>
            {cliente.email || "No registrado"}
          </p>
        </div>

        <div>
          <p className="text-gray-600 flex items-center gap-2">
            <FaMapMarkerAlt className="text-purple-600" />
            <span className="font-medium">Dirección:</span>
            {cliente.direccion || "No registrada"}
          </p>
        </div>
      </div>

      {/* Historial de compras */}
      <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
        Historial de Compras
      </h3>

      {historial && historial.length > 0 ? (
        <div className="space-y-4">
          {historial.map((venta) => (
            <div key={venta.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Encabezado de cada venta */}
              <div className="mb-3">
                <h4 className="font-semibold text-gray-800 text-lg">
                  {venta.descripcion} — {venta.fecha}
                </h4>
              </div>

              {/* Tabla de prendas */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-700">Prenda</th>
                      <th className="px-4 py-2 font-semibold text-gray-700">Gramos</th>
                      <th className="px-4 py-2 font-semibold text-gray-700">Cantidad</th>
                      <th className="px-4 py-2 font-semibold text-gray-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venta.prendas && venta.prendas.length > 0 ? (
                      venta.prendas.map((p) => (
                        <tr key={p.id} className="border-b border-gray-200">
                          <td className="px-4 py-2 text-gray-700">{p.prenda_nombre}</td>
                          <td className="px-4 py-2 text-gray-700">{p.prenda_gramos}</td>
                          <td className="px-4 py-2 text-gray-700">{p.cantidad}</td>
                          <td className="px-4 py-2 text-gray-700">${p.subtotal}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-2 text-gray-500 italic text-center">
                          Sin prendas registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">Sin registros de compras.</p>
      )}
    </div>
  );
};

export default ClientDetail;