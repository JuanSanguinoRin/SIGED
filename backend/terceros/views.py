from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Proveedor, Cliente
from .serializers import ProveedorSerializer, ClienteSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    """
    Vista que permite realizar operaciones CRUD sobre los proveedores.
    Soporta actualizaciones parciales mediante el método PATCH.
    """
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    # 🔍 Nuevo endpoint: búsqueda por nombre
    @action(detail=False, methods=['get'], url_path='buscar_por_nombre')
    def buscar_por_nombre(self, request):
        """
        Permite buscar proveedores por nombre (coincidencia parcial, insensible a mayúsculas).
        Ejemplo: GET /api/proveedores/buscar_por_nombre/?nombre=juan
        """
        nombre = request.query_params.get('nombre', '').strip()
        if not nombre:
            return Response(
                {"error": "Debe proporcionar un nombre para la búsqueda."},
                status=status.HTTP_400_BAD_REQUEST
            )

        proveedores = Proveedor.objects.filter(nombre__icontains=nombre)
        if not proveedores.exists():
            return Response(
                {"error": "No se encontraron proveedores con ese nombre."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(proveedores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ClienteViewSet(viewsets.ModelViewSet):
    """
    Vista que permite realizar operaciones CRUD sobre los clientes.
    Soporta actualizaciones parciales mediante el método PATCH.
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    # 🔍 Endpoint: búsqueda por cédula
    @action(detail=False, methods=['get'], url_path='buscar_por_cedula')
    def buscar_por_cedula(self, request):
        """
        Permite buscar un cliente por su cédula exacta.
        Ejemplo: GET /api/clientes/buscar_por_cedula/?cedula=123456789
        """
        cedula = request.query_params.get('cedula', '').strip()
        if not cedula:
            return Response(
                {"error": "Debe proporcionar una cédula para la búsqueda."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cliente = Cliente.objects.get(cedula=cedula)
        except Cliente.DoesNotExist:
            return Response(
                {"error": "No se encontró un cliente con esa cédula."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(cliente)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 🔍 Nuevo endpoint: búsqueda por nombre
    @action(detail=False, methods=['get'], url_path='buscar_por_nombre')
    def buscar_por_nombre(self, request):
        """
        Permite buscar clientes por nombre (coincidencia parcial, insensible a mayúsculas).
        Ejemplo: GET /api/clientes/buscar_por_nombre/?nombre=juan
        """
        nombre = request.query_params.get('nombre', '').strip()
        if not nombre:
            return Response(
                {"error": "Debe proporcionar un nombre para la búsqueda."},
                status=status.HTTP_400_BAD_REQUEST
            )

        clientes = Cliente.objects.filter(nombre__icontains=nombre)
        if not clientes.exists():
            return Response(
                {"error": "No se encontraron clientes con ese nombre."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(clientes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
