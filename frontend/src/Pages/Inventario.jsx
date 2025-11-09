import React, { useState, useEffect } from "react";
import "../css/Inventario.css";
import ModalEditar from "../Components/ModalEditar";
import ModalArchivar from "../Components/ModalArchivar";
import ModalAgregarProducto from "../Components/ModalAgregarProducto";
import ModalArchivados from "../Components/ModalArchivados";

export default function Inventario() {
  const [prendas, setPrendas] = useState([]);
  const [search, setSearch] = useState("");
  const [filtros, setFiltros] = useState({
    tipoOro: "Todos",
    tipoPrenda: "Todos",
    chatarra: false,
    recuperable: false,
  });

  const [modalEditar, setModalEditar] = useState(null);
  const [modalArchivar, setModalArchivar] = useState(null);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [mostrarArchivados, setMostrarArchivados] = useState(false);

  // 🔹 Cargar datos desde API
  const cargarPrendas = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/prendas/prendas/");
      const data = await res.json();
      setPrendas(data.filter((p) => !p.archivado));
    } catch (err) {
      console.error("Error al obtener prendas:", err);
    }
  };

  useEffect(() => {
    cargarPrendas();
  }, []);

  // Calculamos los totales agrupados solo una vez
const resumenPorOro = (tipoOro) => {
  const prendasOro = prendas.filter(p => p.tipo_oro_nombre === tipoOro);

  const totalGramos = prendasOro
    .filter(p => !p.es_chatarra && !p.es_recuperable)
    .reduce((acc, p) => acc + parseFloat(p.gramos || 0), 0);

  const gramosChatarra = prendasOro
    .filter(p => p.es_chatarra)
    .reduce((acc, p) => acc + parseFloat(p.gramos || 0), 0);

  const gramosRecuperable = prendasOro
    .filter(p => p.es_recuperable)
    .reduce((acc, p) => acc + parseFloat(p.gramos || 0), 0);

  return {
    total: totalGramos.toFixed(2),
    chatarra: gramosChatarra.toFixed(2),
    recuperable: gramosRecuperable.toFixed(2),
  };
};

// Luego en tu JSX:
const italiano = resumenPorOro("ITALIANO");
const nacional = resumenPorOro("NACIONAL");

  // 🔹 Filtrado
  const prendasFiltradas = prendas.filter((p) => {
    const cumpleBusqueda = p.nombre.toLowerCase().includes(search.toLowerCase());
    const cumpleOro =
      filtros.tipoOro === "Todos" || p.tipo_oro_nombre === filtros.tipoOro;
    const cumplePrenda =
      filtros.tipoPrenda === "Todos" || p.tipo_prenda_nombre === filtros.tipoPrenda;
    const cumpleChatarra = !filtros.chatarra || p.es_chatarra;
    const cumpleRecuperable = !filtros.recuperable || p.es_recuperable;

    return cumpleBusqueda && cumpleOro && cumplePrenda && cumpleChatarra && cumpleRecuperable;
  });

  return (
    <div className="inventario-container">
    <div className=" titulo-inventario">
      <h1 className="text-3xl font-bold text-gray-800">Inventario</h1>
    </div>
      

      {/* 🔹 Panel de resumen mejorado */}
    <div className="resumen-panel">
    <div className="resumen-caja italiano">
        <h3>Italiano</h3>
        <p>Total gramos: {italiano.total}g</p>
        <p>Chatarra: {italiano.chatarra}g</p>
        <p>Recuperable: {italiano.recuperable}g</p>
    </div>

    <div className="resumen-caja nacional">
        <h3>Nacional</h3>
        <p>Total gramos: {nacional.total}g</p>
        <p>Chatarra: {nacional.chatarra}g</p>
        <p>Recuperable: {nacional.recuperable}g</p>
    </div>

    <div className="resumen-caja general">
        <h3>General</h3>
        <p>Productos: {prendas.length}</p>
        <p>Gramos totales: {prendas
        .reduce((acc, p) => acc + parseFloat(p.gramos || 0), 0)
        .toFixed(2)}g</p>
    </div>

    <div className="panel-botones">
        <button onClick={() => setMostrarArchivados(true)} className="btn-archivados">📦 Archivados</button>
        <button onClick={() => setMostrarAgregar(true)} className="btn-agregar">+ Añadir Producto</button>

        {mostrarAgregar && (
          <ModalAgregarProducto
            onClose={() => setMostrarAgregar(false)}
            onAdd={() => window.location.reload()}
          />
        )}

        {mostrarArchivados && (
          <ModalArchivados
            onClose={() => setMostrarArchivados(false)}
            onRefresh={() => window.location.reload()}
          />
        )}
            </div>
    </div>


      {/* 🔍 Buscador */}
      <input
        type="text"
        placeholder="Buscar prenda..."
        className="inventario-busqueda"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* 🔽 Filtros mejorados */}
    <div className="inventario-filtros">
    <div className="filtro-grupo">
        <label>Tipo Oro:</label>
        <select
        value={filtros.tipoOro}
        onChange={(e) => setFiltros({ ...filtros, tipoOro: e.target.value })}
        className={`filtro-select ${
            filtros.tipoOro === "ITALIANO" ? "filtro-italiano" :
            filtros.tipoOro === "NACIONAL" ? "filtro-nacional" : ""
        }`}
        >
        <option>Todos</option>
        <option>ITALIANO</option>
        <option>NACIONAL</option>
        </select>
    </div>

    <div className="filtro-grupo">
        
        <label>Tipo Prenda:</label>
        <select
        value={filtros.tipoPrenda}
        onChange={(e) => setFiltros({ ...filtros, tipoPrenda: e.target.value })}
        className="filtro-select filtro-prenda"
        >
        <option>Todos</option>
          {[...new Set(prendas.map((p) => p.tipo_prenda_nombre))].map((tp) => (
            <option key={tp}>{tp}</option>
          ))}
        </select>
    </div>

    <div className="filtro-checkbox chatarra">
        <label>Chatarra</label>
        <input
            type="checkbox"
            checked={filtros.chatarra}
            onChange={(e) =>
              setFiltros({ ...filtros, chatarra: e.target.checked })
            }
          />
    </div>

    <div className="filtro-checkbox recuperable">
        <label>Recuperable</label>
        <input
            type="checkbox"
            checked={filtros.recuperable}
            onChange={(e) =>
              setFiltros({ ...filtros, recuperable: e.target.checked })
            }
          />
    </div>
    </div>


      {/* 🧾 Tabla */}
      <table className="inventario-tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Material</th>
            <th>Peso</th>
            <th>Cantidad</th>
            <th>Chatarra</th>
            <th>Recuperable</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {prendasFiltradas.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{p.tipo_prenda_nombre}</td>
              <td>{p.tipo_oro_nombre}</td>
              <td>{p.gramos}g</td>
              <td className={p.existencia > 0 ? "cantidad-verde" : "cantidad-roja"}>
                {p.existencia}
              </td>
              <td>{p.es_chatarra ? "✅" : "❌"}</td>
              <td>{p.es_recuperable ? "✅" : "❌"}</td>
              <td>
                <button
                  className="btn-editar"
                  onClick={() => setModalEditar(p)}
                >
                  ✏️
                </button>
                <button
                  className="btn-archivar"
                  onClick={() => setModalArchivar(p)}
                >
                  📦
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalEditar && (
        <ModalEditar
          prenda={modalEditar}
          onClose={() => setModalEditar(null)}
          onSaved={cargarPrendas}
        />
      )}

      {modalArchivar && (
        <ModalArchivar
          prenda={modalArchivar}
          onClose={() => setModalArchivar(null)}
          onArchived={cargarPrendas}
        />
      )}
    </div>
  );
}
