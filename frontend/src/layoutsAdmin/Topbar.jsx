"use client";

import { useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import { IoMdArrowDropdown } from "react-icons/io";

export default function Topbar({ onMobileMenuToggle }) {
  const [openMenu, setOpenMenu] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/auth/logout/", {
        method: "POST",
        credentials: "include", // necesario para borrar la sesión
      });

      if (response.ok) {
        // Redirige al login
        window.location.href = "/login";
      } else {
        console.error("Error al cerrar sesión");
      }
    } catch (error) {
      console.error("Error de red:", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-gray-800 text-white shadow-md h-16">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Botón menú móvil + Logo + Título */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
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
          </button>

          <img
            src="/dubai.png"
            alt="Logo Joyería Dubai"
            className="w-8 h-8"
          />
          <span className="text-xl font-semibold tracking-wide">
            DUBAI JOYERIA
          </span>
        </div>

        {/* Avatar + menú de usuario */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(!openMenu)}
            className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="text-2xl">👩‍💻</span>
            <span className="text-sm">Bienvenida Susana</span>
            <IoMdArrowDropdown className="text-xl" />
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white text-[#2E2E2E] shadow-lg rounded-lg overflow-hidden z-50">
              <button onClick={handleLogout} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
