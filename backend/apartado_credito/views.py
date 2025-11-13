from rest_framework import viewsets, status
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from .models import Apartado, Credito, Cuota
from .serializers import ApartadoSerializer, CreditoSerializer, CuotaSerializer

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from rest_framework.decorators import action
from compra_venta.models import Venta
from compra_venta.serializers import VentaSerializer


class ApartadoViewSet(viewsets.ModelViewSet):
    queryset = Apartado.objects.all()
    serializer_class = ApartadoSerializer

    def perform_create(self, serializer):
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Permitir actualizaciones parciales (PATCH)"""
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CreditoViewSet(viewsets.ModelViewSet):
    queryset = Credito.objects.all()
    serializer_class = CreditoSerializer

    def perform_create(self, serializer):
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CuotaViewSet(viewsets.ModelViewSet):
    queryset = Cuota.objects.all()
    serializer_class = CuotaSerializer

    def perform_create(self, serializer):
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DeudasPorClienteView(APIView):
    """
    Devuelve todas las deudas (créditos y apartados) del cliente indicado.
    GET /api/apartado_credito/deudas-por-cliente/<cliente_id>/
    """
    def get(self, request, cliente_id):
        # Ventas del cliente con crédito o apartado
        ventas = Venta.objects.filter(cliente_id=cliente_id).select_related('credito', 'apartado')

        por_cobrar = []
        for v in ventas:
            if v.credito:
                por_cobrar.append({
                    "venta_id": v.id,
                    "tipo": "Crédito",
                    "total": v.total,
                    "cuotas_pendientes": v.credito.cuotas_pendientes,
                    "fecha_limite": v.credito.fecha_limite,
                    "estado": str(v.credito.estado)
                })
            elif v.apartado:
                por_cobrar.append({
                    "venta_id": v.id,
                    "tipo": "Apartado",
                    "total": v.total,
                    "cuotas_pendientes": v.apartado.cuotas_pendientes,
                    "fecha_limite": v.apartado.fecha_limite,
                    "estado": str(v.apartado.estado)
                })

        return Response({
            "cliente_id": cliente_id,
            "por_cobrar": por_cobrar
        }, status=status.HTTP_200_OK)
