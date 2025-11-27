# egreso_ingreso/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EgresoViewSet, IngresoViewSet

router = DefaultRouter()
router.register(r'egresos', EgresoViewSet, basename='egreso')
router.register(r'ingresos', IngresoViewSet, basename='ingreso')

urlpatterns = [
    path('', include(router.urls)),
]
