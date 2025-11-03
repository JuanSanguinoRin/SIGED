from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Compra, Venta
from .serializers import CompraSerializer, VentaSerializer


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.all().select_related('proveedor', 'metodo_pago')
    serializer_class = CompraSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha', 'total']

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        """
        Endpoint de búsqueda por:
        - fecha (YYYY-MM-DD)
        - proveedor (nombre)
        - id (consecutivo)
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response({"detail": "Proporcione un parámetro 'q' para buscar."}, status=400)

        compras = Compra.objects.filter(
            Q(id__icontains=query) |
            Q(fecha__icontains=query) |
            Q(proveedor__nombre__icontains=query)
        )
        serializer = self.get_serializer(compras, many=True)
        return Response(serializer.data)


class VentaViewSet(viewsets.ModelViewSet):
    queryset = Venta.objects.all().select_related('cliente', 'metodo_pago')
    serializer_class = VentaSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha', 'total']

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        """
        Endpoint de búsqueda por:
        - fecha (YYYY-MM-DD)
        - cliente (nombre)
        - id (consecutivo)
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response({"detail": "Proporcione un parámetro 'q' para buscar."}, status=400)

        ventas = Venta.objects.filter(
            Q(id__icontains=query) |
            Q(fecha__icontains=query) |
            Q(cliente__nombre__icontains=query)
        )
        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)
