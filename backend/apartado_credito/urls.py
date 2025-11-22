from rest_framework import routers
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApartadoViewSet, CreditoViewSet, CuotaViewSet, DeudasPorClienteView
from .views import (
    deudas_por_cobrar_optimizado,  
    deudas_por_pagar_optimizado     
)

router = routers.DefaultRouter()
router.register(r"apartados", ApartadoViewSet)
router.register(r"creditos", CreditoViewSet)
router.register(r"cuotas", CuotaViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("deudas-por-cliente/<int:cliente_id>/", DeudasPorClienteView.as_view()),
    path('deudas-por-cobrar-optimizado/', deudas_por_cobrar_optimizado, name='deudas-cobrar-opt'),  # ← AGREGAR
    path('deudas-por-pagar-optimizado/', deudas_por_pagar_optimizado, name='deudas-pagar-opt'),    # ← AGREGAR
]
