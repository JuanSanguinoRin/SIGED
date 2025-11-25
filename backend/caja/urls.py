# caja/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CuentaBancariaViewSet,
    TipoMovimientoViewSet,
    MovimientoCajaViewSet,
    CierreCajaViewSet
)

# Crear el router
router = DefaultRouter()

# Registrar los ViewSets
router.register(r'cuentas', CuentaBancariaViewSet, basename='cuenta')
router.register(r'tipos-movimiento', TipoMovimientoViewSet, basename='tipo-movimiento')
router.register(r'movimientos', MovimientoCajaViewSet, basename='movimiento')
router.register(r'cierres', CierreCajaViewSet, basename='cierre')

urlpatterns = [
    path('', include(router.urls)),
]