"use client";

import { NavLink } from "react-router-dom";
import { useState } from "react";
import {
  FaHome,
  FaUser,
  FaTruck,
  FaBoxes,
  FaCashRegister,
  FaMoneyBillAlt,
  FaChevronDown,
} from "react-icons/fa";

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}) {
  const [deudasOpen, setDeudasOpen] = useState(false);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed z-30 top-16 left-0 h-[calc(100vh-4rem)] bg-gray-800 text-white shadow-lg transition-all duration-300 ease-out
          ${collapsed ? "w-20" : "w-64"}
          md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-4 hidden md:block">
          <button
            onClick={onToggle}
            className={`w-full text-left font-semibold text-white hover:text-purple-400 transition-colors ${
              collapsed ? "flex justify-center" : ""
            }`}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            ) : (
              <span className="text-base">Menú</span>
            )}
          </button>
        </div>

        <nav className="px-4 mt-2 space-y-1 text-white">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "hover:bg-gray-700"
              }`
            }
          >
            <FaHome /> {!collapsed && "Inicio"}
          </NavLink>

          <NavLink
            to="/admin/clientes"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "hover:bg-gray-700"
              }`
            }
          >
            <FaUser /> {!collapsed && "Clientes"}
          </NavLink>

          <NavLink
            to="/admin/proveedores"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "hover:bg-gray-700"
              }`
            }
          >
            <FaTruck /> {!collapsed && "Proveedores"}
          </NavLink>

          {/* Submenú Deudas */}
          <button
            onClick={() => setDeudasOpen(!deudasOpen)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="flex items-center gap-3">
              <FaMoneyBillAlt /> {!collapsed && "Deudas"}
            </span>
            {!collapsed && <FaChevronDown className={`transition-transform ${deudasOpen ? "rotate-180" : ""}`} />}
          </button>
          {deudasOpen && !collapsed && (
            <div className="ml-10 space-y-1">
              <NavLink
                to="/admin/deudas/cobrar"
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "hover:bg-gray-700"
                  }`
                }
              >
                Cobrar
              </NavLink>
              <NavLink
                to="/admin/deudas/pagar"
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "hover:bg-gray-700"
                  }`
                }
              >
                Pagar
              </NavLink>
            </div>
          )}

          <NavLink
            to="/admin/inventario"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "hover:bg-gray-700"
              }`
            }
          >
            <FaBoxes /> {!collapsed && "Inventario"}
          </NavLink>

          <NavLink
            to="/admin/caja"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-purple-600 text-white"
                  : "hover:bg-gray-700"
              }`
            }
          >
            <FaCashRegister /> {!collapsed && "Caja"}
          </NavLink>
          <NavLink
            to="/admin/ventas"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? "bg-purple-600 text-white"
                : "hover:bg-gray-700"
              }`
            }
          >
            <FaCashRegister /> {!collapsed && "Ventas"}
          </NavLink>
        </nav>
      </aside>
    </>
  );
}
