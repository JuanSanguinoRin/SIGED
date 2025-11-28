from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompraViewSet, VentaViewSet
from .dashboard_view import DashboardResumenView

# Crear el router para registrar los viewsets
router = DefaultRouter()
router.register(r'compras', CompraViewSet, basename='compra')
router.register(r'ventas', VentaViewSet, basename='venta')

# URLs de la aplicación
urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/resumen/', DashboardResumenView.as_view(), name='dashboard-resumen'),
]

# Estructura de URLs disponibles:
#
# ============ COMPRAS ============
# GET    /api/compras/                              - Listar todas las compras
# POST   /api/compras/                              - Crear nueva compra
# GET    /api/compras/{id}/                         - Obtener compra específica
# PUT    /api/compras/{id}/                         - Actualizar compra completa
# PATCH  /api/compras/{id}/                         - Actualizar parcialmente
# DELETE /api/compras/{id}/                         - Eliminar compra
#
# Búsquedas separadas (Compras):
# GET    /api/compras/buscar/por-id/?q=123         - Buscar por ID
# GET    /api/compras/buscar/por-fecha/?q=2025-11  - Buscar por fecha
# GET    /api/compras/buscar/por-proveedor/?q=Juan - Buscar por proveedor
#
# ============ VENTAS ============
# GET    /api/ventas/                               - Listar todas las ventas
# POST   /api/ventas/                               - Crear nueva venta
# GET    /api/ventas/{id}/                          - Obtener venta específica
# PUT    /api/ventas/{id}/                          - Actualizar venta completa
# PATCH  /api/ventas/{id}/                          - Actualizar parcialmente
# DELETE /api/ventas/{id}/                          - Eliminar venta
#
# Búsquedas separadas (Ventas):
# GET    /api/ventas/buscar/por-id/?q=123          - Buscar por ID
# GET    /api/ventas/buscar/por-fecha/?q=2025-11   - Buscar por fecha
# GET    /api/ventas/buscar/por-cliente/?q=Juan    - Buscar por cliente
