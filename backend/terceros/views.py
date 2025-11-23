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

    def get_queryset(self):
        """
        Filtra por proveedores archivados o no según el parámetro.
        Ejemplo: ?archivado=true
        """
        # 🔹 Para las acciones de archivar/desarchivar, devolver TODOS
        if self.action in ['archivar', 'desarchivar']:
            return Proveedor.objects.all()
        
        archivado = self.request.query_params.get("archivado", "false").lower()
        if archivado == "true":
            return Proveedor.objects.filter(archivado=True)
        return Proveedor.objects.filter(archivado=False)

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

    # 🔍 Búsqueda por nombre
    @action(detail=False, methods=['get'], url_path='buscar_por_nombre')
    def buscar_por_nombre(self, request):
        nombre = request.query_params.get('nombre', '').strip()
        if not nombre:
            return Response({"error": "Debe proporcionar un nombre."}, status=status.HTTP_400_BAD_REQUEST)

        proveedores = Proveedor.objects.filter(nombre__icontains=nombre, archivado=False)
        if not proveedores.exists():
            return Response({"error": "No se encontraron proveedores."}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(proveedores, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 🗃️ Archivar proveedor
    @action(detail=True, methods=['patch'], url_path='archivar')
    def archivar(self, request, pk=None):
        proveedor = self.get_object()
        proveedor.archivado = True
        proveedor.save()
        return Response({
            "mensaje": "Proveedor archivado correctamente.",
            "archivado": proveedor.archivado
        }, status=status.HTTP_200_OK)
    
    # 🗃️ Desarchivar proveedor
    @action(detail=True, methods=['patch'], url_path='desarchivar')
    def desarchivar(self, request, pk=None):
        proveedor = self.get_object()
        proveedor.archivado = False
        proveedor.save()
        return Response({
            "mensaje": "Proveedor desarchivado correctamente.",
            "archivado": proveedor.archivado
        }, status=status.HTTP_200_OK)


class ClienteViewSet(viewsets.ModelViewSet):
    """
    Vista que permite realizar operaciones CRUD sobre los clientes.
    Soporta actualizaciones parciales mediante el método PATCH.
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

    def get_queryset(self):
        # 🔹 Para las acciones de archivar/desarchivar, devolver TODOS
        if self.action in ['archivar', 'desarchivar']:
            return Cliente.objects.all()
        
        archivado = self.request.query_params.get("archivado", "false").lower()
        if archivado == "true":
            return Cliente.objects.filter(archivado=True)
        return Cliente.objects.filter(archivado=False)

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

    # 🔍 Búsqueda por cédula
    @action(detail=False, methods=['get'], url_path='buscar_por_cedula')
    def buscar_por_cedula(self, request):
        cedula = request.query_params.get('cedula', '').strip()
        if not cedula:
            return Response({"error": "Debe proporcionar una cédula."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            cliente = Cliente.objects.get(cedula=cedula, archivado=False)
        except Cliente.DoesNotExist:
            return Response({"error": "No se encontró un cliente."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(cliente)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 🔍 Búsqueda por nombre
    @action(detail=False, methods=['get'], url_path='buscar_por_nombre')
    def buscar_por_nombre(self, request):
        nombre = request.query_params.get('nombre', '').strip()
        if not nombre:
            return Response({"error": "Debe proporcionar un nombre."}, status=status.HTTP_400_BAD_REQUEST)

        clientes = Cliente.objects.filter(nombre__icontains=nombre, archivado=False)
        if not clientes.exists():
            return Response({"error": "No se encontraron clientes."}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(clientes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 🗃️ Archivar cliente
    @action(detail=True, methods=['patch'], url_path='archivar')
    def archivar(self, request, pk=None):
        cliente = self.get_object()
        cliente.archivado = True
        cliente.save()
        return Response({
            "mensaje": "Cliente archivado correctamente.",
            "archivado": cliente.archivado
        }, status=status.HTTP_200_OK)

    # 🗃️ Desarchivar cliente
    @action(detail=True, methods=['patch'], url_path='desarchivar')
    def desarchivar(self, request, pk=None):
        cliente = self.get_object()
        cliente.archivado = False
        cliente.save()
        return Response({
            "mensaje": "Cliente desarchivado correctamente.",
            "archivado": cliente.archivado
        }, status=status.HTTP_200_OK)
