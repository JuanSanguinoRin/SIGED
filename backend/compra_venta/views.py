from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Compra, CompraPrenda, Venta, VentaPrenda
from .serializers import (
    CompraSerializer, CompraCreateUpdateSerializer,
    VentaSerializer, VentaCreateUpdateSerializer
)


class CompraViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Compras con CRUD completo
    
    Endpoints:
    - GET /api/compras/ - Listar todas las compras
    - POST /api/compras/ - Crear nueva compra
    - GET /api/compras/{id}/ - Obtener compra específica
    - PUT /api/compras/{id}/ - Actualizar compra completa
    - PATCH /api/compras/{id}/ - Actualizar parcialmente
    - DELETE /api/compras/{id}/ - Eliminar compra
    
    - GET /api/compras/buscar/por-id/ - Buscar por ID
    - GET /api/compras/buscar/por-fecha/ - Buscar por fecha
    - GET /api/compras/buscar/por-proveedor/ - Buscar por proveedor
    """
    queryset = Compra.objects.select_related(
        'proveedor', 'metodo_pago', 'credito'
    ).prefetch_related('prendas__prenda')
    filter_backends = []
    ordering_fields = ['fecha', 'total', 'id']
    ordering = ['-fecha']

    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return CompraCreateUpdateSerializer
        return CompraSerializer

    def get_queryset(self):
        """Optimizar queryset según la acción"""
        if self.action == 'retrieve':
            return self.queryset.prefetch_related('prendas__prenda')
        return self.queryset

    @action(detail=False, methods=['get'], url_path='buscar/por-id')
    def buscar_por_id(self, request):
        """
        Buscar compra por ID (consecutivo)
        Query params: ?q=123
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"detail": "Proporcione un parámetro 'q' con el ID de la compra."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            compra_id = int(query)
            compras = self.get_queryset().filter(id=compra_id)
        except ValueError:
            return Response(
                {"detail": "El ID debe ser un número entero."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(compras, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='buscar/por-fecha')
    def buscar_por_fecha(self, request):
        """
        Buscar compra por fecha
        Query params: ?q=2025-11-03
        Soporta búsqueda parcial (año, año-mes)
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"detail": "Proporcione un parámetro 'q' con la fecha (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        compras = self.get_queryset().filter(fecha__icontains=query)
        
        if not compras.exists():
            return Response(
                {"detail": f"No se encontraron compras para la fecha '{query}'."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(compras, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='buscar/por-proveedor')
    def buscar_por_proveedor(self, request):
        """
        Buscar compra por nombre del proveedor
        Query params: ?q=Juan
        Búsqueda insensible a mayúsculas/minúsculas
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"detail": "Proporcione un parámetro 'q' con el nombre del proveedor."},
                status=status.HTTP_400_BAD_REQUEST
            )

        compras = self.get_queryset().filter(
            proveedor__nombre__icontains=query
        )
        
        if not compras.exists():
            return Response(
                {"detail": f"No se encontraron compras del proveedor '{query}'."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(compras, many=True)
        return Response(serializer.data)


class VentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Ventas con CRUD completo
    
    Endpoints:
    - GET /api/ventas/ - Listar todas las ventas
    - POST /api/ventas/ - Crear nueva venta
    - GET /api/ventas/{id}/ - Obtener venta específica
    - PUT /api/ventas/{id}/ - Actualizar venta completa
    - PATCH /api/ventas/{id}/ - Actualizar parcialmente
    - DELETE /api/ventas/{id}/ - Eliminar venta
    
    - GET /api/ventas/buscar/por-id/ - Buscar por ID
    - GET /api/ventas/buscar/por-fecha/ - Buscar por fecha
    - GET /api/ventas/buscar/por-cliente/ - Buscar por cliente
    """
    queryset = Venta.objects.select_related(
        'cliente', 'metodo_pago', 'credito', 'apartado'
    ).prefetch_related('prendas__prenda')
    filter_backends = []
    ordering_fields = ['fecha', 'total', 'id']
    ordering = ['-fecha']

    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return VentaCreateUpdateSerializer
        return VentaSerializer

    def get_queryset(self):
        """Optimizar queryset según la acción"""
        if self.action == 'retrieve':
            return self.queryset.prefetch_related('prendas__prenda')
        return self.queryset

    @action(detail=False, methods=['get'], url_path='buscar/por-id')
    def buscar_por_id(self, request):
        """
        Buscar venta por ID (consecutivo)
        Query params: ?q=123
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"detail": "Proporcione un parámetro 'q' con el ID de la venta."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            venta_id = int(query)
            ventas = self.get_queryset().filter(id=venta_id)
        except ValueError:
            return Response(
                {"detail": "El ID debe ser un número entero."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='buscar/por-fecha')
    def buscar_por_fecha(self, request):
        """
        Buscar venta por fecha
        Query params: ?q=2025-11-03
        Soporta búsqueda parcial (año, año-mes)
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"detail": "Proporcione un parámetro 'q' con la fecha (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ventas = self.get_queryset().filter(fecha__icontains=query)
        
        if not ventas.exists():
            return Response(
                {"detail": f"No se encontraron ventas para la fecha '{query}'."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='buscar/por-cliente')
    def buscar_por_cliente(self, request):
        """
        Buscar venta por nombre del cliente
        Query params: ?q=Juan
        Búsqueda insensible a mayúsculas/minúsculas
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {"detail": "Proporcione un parámetro 'q' con el nombre del cliente."},
                status=status.HTTP_400_BAD_REQUEST
            )

        ventas = self.get_queryset().filter(
            cliente__nombre__icontains=query
        )
        
        if not ventas.exists():
            return Response(
                {"detail": f"No se encontraron ventas del cliente '{query}'."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)