import React, { useState, useEffect } from "react";
import "../css/Inventario.css";
import ModalEditar from "../Components/ModalEditar";
import ModalArchivar from "../Components/ModalArchivar";
import ModalAgregarProducto from "../Components/ModalAgregarProducto";
import ModalArchivados from "../Components/ModalArchivados";
import { FaBox, FaPlus, FaCheck, FaTimes, FaWeight, FaHashtag, FaTag, FaGem, FaLayerGroup } from "react-icons/fa";
import { MdArchive, MdUnarchive, MdCategory } from "react-icons/md";
import { TbEdit } from "react-icons/tb";
import { BiPackage } from "react-icons/bi";
import { GiGoldBar, GiRecycle } from "react-icons/gi";
import { RiRecycleLine } from "react-icons/ri";
import { apiUrl } from "../config/api";

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
      const res = await fetch(apiUrl("/prendas/prendas/"));
      if (!res.ok) throw new Error("Error al obtener prendas");
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

    // gramos de prendas (normales: no chatarra ni recuperable)
    const gramosPrendas = prendasOro
      .filter(p => !p.es_chatarra && !p.es_recuperable)
      .reduce((acc, p) => {
        const gramos = parseFloat(p.gramos || 0);
        const existencia = parseFloat(p.existencia || 0);
        return acc + gramos * existencia;
      }, 0);

    const gramosChatarra = prendasOro
      .filter(p => p.es_chatarra)
      .reduce((acc, p) => {
        const gramos = parseFloat(p.gramos || 0);
        const existencia = parseFloat(p.existencia || 0);
        return acc + gramos * existencia;
      }, 0);

    const gramosRecuperable = prendasOro
      .filter(p => p.es_recuperable)
      .reduce((acc, p) => {
        const gramos = parseFloat(p.gramos || 0);
        const existencia = parseFloat(p.existencia || 0);
        return acc + gramos * existencia;
      }, 0);

    const total = gramosPrendas + gramosChatarra + gramosRecuperable;

    return {
      prendas: gramosPrendas.toFixed(2),
      chatarra: gramosChatarra.toFixed(2),
      recuperable: gramosRecuperable.toFixed(2),
      total: total.toFixed(2),
    };
  };

  // Luego en tu JSX:
  const italiano = resumenPorOro("ITALIANO");
  const nacional = resumenPorOro("NACIONAL");

  // Contadores de unidades por tipo de oro
  const unidadesItaliano = prendas.filter(p => p.tipo_oro_nombre === "ITALIANO").length;
  const unidadesNacional = prendas.filter(p => p.tipo_oro_nombre === "NACIONAL").length;

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
      <div className="header-inventario">
        <h1 className="text-3xl font-bold text-gray-800">Inventario</h1>
        <div className="header-botones">
          <button onClick={() => setMostrarArchivados(true)} className="btn-archivados btn-flex">
            <MdUnarchive size={19} /> <span>Archivados</span>
          </button>

          <button onClick={() => setMostrarAgregar(true)} className="btn-agregar btn-flex">
            <FaPlus size={16} /> <span>Añadir Producto</span>
          </button>
        </div>
      </div>

      {/* 🔹 Panel de resumen mejorado */}
      <div className="resumen-panel">
        {/* SECCIÓN ITALIANO */}
        <div className="resumen-caja resumen-italiano">
          <div className="resumen-header">
            <h3>Italiano</h3>
          </div>

          <div className="resumen-body">
            <div className="resumen-item">
              <span><FaLayerGroup className="inline mr-1" />Total gramos</span>
              <strong>{italiano.total} g</strong>
            </div>

            <div className="resumen-item">
              <span><GiGoldBar className="inline mr-1" />Oro</span>
              <strong>{italiano.prendas} g</strong>
            </div>

            <div className="resumen-item">
              <span><GiRecycle className="inline mr-1" />Chatarra</span>
              <strong>{italiano.chatarra} g</strong>
            </div>

            <div className="resumen-item">
              <span><RiRecycleLine className="inline mr-1" />Recuperable</span>
              <strong>{italiano.recuperable} g</strong>
            </div>
          </div>
        </div>

        {/* SECCIÓN NACIONAL */}
        <div className="resumen-caja resumen-nacional">
          <div className="resumen-header">
            <h3>Nacional</h3>
          </div>

          <div className="resumen-body">
            <div className="resumen-item">
              <span><FaLayerGroup className="inline mr-1" />Total gramos</span>
              <strong>{nacional.total} g</strong>
            </div>

            <div className="resumen-item">
              <span><GiGoldBar className="inline mr-1" />Oro</span>
              <strong>{nacional.prendas} g</strong>
            </div>

            <div className="resumen-item">
              <span><GiRecycle className="inline mr-1" />Chatarra</span>
              <strong>{nacional.chatarra} g</strong>
            </div>

            <div className="resumen-item">
              <span><RiRecycleLine className="inline mr-1" />Recuperable</span>
              <strong>{nacional.recuperable} g</strong>
            </div>
          </div>
        </div>

        {/* SECCIÓN GENERAL */}
        <div className="resumen-caja resumen-general">
          <div className="resumen-header">
            <h3>General</h3>
          </div>

          <div className="resumen-body">
            <div className="resumen-item">
              <span><BiPackage className="inline mr-1" />Productos</span>
              <strong>{prendas.length}</strong>
            </div>

            <div className="resumen-item">
              <span><FaGem className="inline mr-1" style={{color: '#FFD700'}} />Italiano (unidades)</span>
              <strong>{unidadesItaliano}</strong>
            </div>

            <div className="resumen-item">
              <span><FaGem className="inline mr-1" style={{color: '#6B8EAD'}} />Nacional (unidades)</span>
              <strong>{unidadesNacional}</strong>
            </div>

            <div className="resumen-item">
              <span><FaWeight className="inline mr-1" />Gramos totales</span>
              <strong>
                {prendas
                  .reduce((acc, p) => {
                    const gramos = parseFloat(p.gramos || 0);
                    const existencia = parseFloat(p.existencia || 0);
                    return acc + gramos * existencia;
                  }, 0)
                  .toFixed(2)} g
              </strong>
            </div>
          </div>
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
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked && filtros.recuperable) {
                alert("No puede seleccionar 'Chatarra' y 'Recuperable' al mismo tiempo.");
                return;
              }
              setFiltros({ ...filtros, chatarra: checked });
            }}
          />
        </div>

        <div className="filtro-checkbox recuperable">
          <label>Recuperable</label>
          <input
            type="checkbox"
            checked={filtros.recuperable}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked && filtros.chatarra) {
                alert("No puede seleccionar 'Chatarra' y 'Recuperable' al mismo tiempo.");
                return;
              }
              setFiltros({ ...filtros, recuperable: checked });
            }}
          />
        </div>
      </div>

      {/* 🧾 Tabla */}
      <table className="inventario-tabla">
        <thead>
          <tr>
            <th><BiPackage className="inline mr-1" />Producto</th>
            <th><MdCategory className="inline mr-1" />Categoría</th>
            <th><FaGem className="inline mr-1" />Material</th>
            <th><FaWeight className="inline mr-1" />Peso</th>
            <th><FaHashtag className="inline mr-1" />Cantidad</th>
            <th><FaTag className="inline mr-1" />Chatarra</th>
            <th><FaTag className="inline mr-1" />Recuperable</th>
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
              <td>
                {p.es_chatarra ? (
                  <FaCheck size={16} color="#0a9300" className="icon-verde" />
                ) : (
                  <FaTimes size={16} color="#c40000" className="icon-rojo" />
                )}
              </td>

              <td>
                {p.es_recuperable ? (
                  <FaCheck size={16} color="#0a9300" className="icon-verde" />
                ) : (
                  <FaTimes size={16} color="#c40000" className="icon-rojo" />
                )}
              </td>

              <td>
                <button
                  className="btn-editar btn-flex"
                  onClick={() => setModalEditar(p)}
                >
                  <TbEdit size={16} />
                </button>

                <button
                  className="btn-archivar btn-flex"
                  onClick={() => setModalArchivar(p)}
                >
                  <MdArchive size={19} />
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
  );
}