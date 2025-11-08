import React from "react";
import { FaPhone, FaEnvelope, FaIdCard, FaMapMarkerAlt } from "react-icons/fa";
import PurchaseSummary from "./PurchaseSummary";
import PurchaseHistoryTable from "./PurchaseHistoryTable";

const ClientDetail = ({ cliente, resumen, historial }) => {
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
            <FaIdCard className="text-purple-600" />{" "}
            <span className="font-medium">Cédula:</span> {cliente.cedula}
          </p>
          <p className="text-gray-600 flex items-center gap-2 mt-2">
            <FaPhone className="text-purple-600" />{" "}
            <span className="font-medium">Teléfono:</span>{" "}
            {cliente.telefono || "No registrado"}
          </p>
          <p className="text-gray-600 flex items-center gap-2 mt-2">
            <FaEnvelope className="text-purple-600" />{" "}
            <span className="font-medium">Correo:</span>{" "}
            {cliente.email || "No registrado"}
          </p>
        </div>

        <div>
          <p className="text-gray-600 flex items-center gap-2">
            <FaMapMarkerAlt className="text-purple-600" />{" "}
            <span className="font-medium">Dirección:</span>{" "}
            {cliente.direccion || "No registrada"}
          </p>
        </div>
      </div>

      {/* Resumen de compras */}
      <h3 className="text-xl font-semibold text-gray-800 mb-3">
        Resumen de Compras
      </h3>
      <PurchaseSummary resumen={resumen} />

      {/* Historial de compras */}
      <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
        Historial de Compras
      </h3>
      <PurchaseHistoryTable historial={historial} />
    </div>
  );
};

export default ClientDetail;
