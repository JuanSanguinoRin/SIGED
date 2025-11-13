from rest_framework import routers
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApartadoViewSet, CreditoViewSet, CuotaViewSet, DeudasPorClienteView

router = routers.DefaultRouter()
router.register(r"apartados", ApartadoViewSet)
router.register(r"creditos", CreditoViewSet)
router.register(r"cuotas", CuotaViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("deudas-por-cliente/<int:cliente_id>/", DeudasPorClienteView.as_view()),
]
