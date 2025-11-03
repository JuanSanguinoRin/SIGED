from rest_framework.routers import DefaultRouter
from .views import CompraViewSet, VentaViewSet

router = DefaultRouter()
router.register(r'compras', CompraViewSet, basename='compras')
router.register(r'ventas', VentaViewSet, basename='ventas')

urlpatterns = router.urls
