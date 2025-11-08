import React from "react";

const PurchaseHistoryTable = ({ historial }) => {
  return (
    <table className="w-full text-sm text-left border border-gray-200 rounded-lg">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border-b">Producto</th>
          <th className="p-2 border-b">Fecha</th>
          <th className="p-2 border-b">Monto</th>
        </tr>
      </thead>
      <tbody>
        {historial.map((compra) => (
          <tr key={compra.id} className="hover:bg-gray-50">
            <td className="p-2 border-b">{compra.producto}</td>
            <td className="p-2 border-b">{compra.fecha}</td>
            <td className="p-2 border-b">${compra.monto.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PurchaseHistoryTable;
