import React from "react";

const PurchaseSummary = ({ resumen }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
      <p><strong>Total de Compras:</strong> ${resumen.totalCompras.toLocaleString()}</p>
      <p><strong>Cantidad de Compras:</strong> {resumen.cantidadCompras}</p>
    </div>
  );
};

export default PurchaseSummary;
