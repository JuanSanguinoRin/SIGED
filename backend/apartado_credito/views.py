from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from .models import Apartado, Credito, Cuota
from .serializers import ApartadoSerializer, CreditoSerializer, CuotaSerializer
from decimal import Decimal
from django.db import transaction  # ← Agregar esta línea al inicio

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
            # Guardar instancia primero
            apartado = serializer.save()

            # Asignaciones automáticas según reglas de negocio:
            # - cuotas_pendientes = cantidad_cuotas
            try:
                apartado.cuotas_pendientes = apartado.cantidad_cuotas
            except Exception:
                apartado.cuotas_pendientes = apartado.cuotas_pendientes

            # - monto_total y monto_pendiente: si existe una Venta o Compra que haga referencia,
            #   usar su total; si no, dejar en 0.00
            from compra_venta.models import Venta
            total_val = None
            venta = Venta.objects.filter(apartado=apartado).first()
            if venta:
                total_val = venta.total
            if total_val is None:
                # mantener valor por defecto si no se encuentra venta
                total_val = apartado.monto_total if apartado.monto_total is not None else Decimal('0.00')

            apartado.monto_total = total_val
            apartado.monto_pendiente = total_val
            apartado.full_clean()
            apartado.save()
            return apartado
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"warning": e.message if hasattr(e, 'message') else str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Permitir actualizaciones parciales (PATCH)"""
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"warning": e.message if hasattr(e, 'message') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        apartado = self.get_object()

        try:
            with transaction.atomic():
                apartado.cancelar()
            return Response({"message": "Apartado cancelado correctamente"}, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=400)


class CreditoViewSet(viewsets.ModelViewSet):
    queryset = Credito.objects.all()
    serializer_class = CreditoSerializer

    def perform_create(self, serializer):
        try:
            serializer.is_valid(raise_exception=True)
            credito = serializer.save()

            # cuotas_pendientes = cantidad_cuotas
            try:
                credito.cuotas_pendientes = credito.cantidad_cuotas
            except Exception:
                credito.cuotas_pendientes = credito.cuotas_pendientes

            # monto_total y monto_pendiente si hay Venta o Compra referenciando
            from compra_venta.models import Venta, Compra
            total_val = None
            venta = Venta.objects.filter(credito=credito).first()
            if venta:
                total_val = venta.total
            else:
                compra = Compra.objects.filter(credito=credito).first()
                if compra:
                    total_val = compra.total

            if total_val is None:
                total_val = credito.monto_total if credito.monto_total is not None else Decimal('0.00')

            credito.monto_total = total_val
            credito.monto_pendiente = total_val
            credito.full_clean()
            credito.save()
            return credito
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"warning": e.message if hasattr(e, 'message') else str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"warning": e.message if hasattr(e, 'message') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        credito = self.get_object() 

        try:
            with transaction.atomic():
                credito.cancelar()
            return Response({"message": "Crédito cancelado correctamente"}, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=400)


class CuotaViewSet(viewsets.ModelViewSet):
    queryset = Cuota.objects.all()
    serializer_class = CuotaSerializer

    def get_queryset(self):
        """Permitir filtrar cuotas por crédito o apartado"""
        queryset = super().get_queryset()
        credito_id = self.request.query_params.get('credito', None)
        apartado_id = self.request.query_params.get('apartado', None)
        
        if credito_id:
            queryset = queryset.filter(credito_id=credito_id)
        if apartado_id:
            queryset = queryset.filter(apartado_id=apartado_id)
            
        return queryset.order_by('-fecha')

    def perform_create(self, serializer):
        try:
            serializer.is_valid(raise_exception=True)
            from django.db import transaction

            with transaction.atomic():
                cuota = serializer.save()

                # Si la cuota pertenece a un crédito
                if cuota.credito:
                    credito = cuota.credito
                    # disminuir cuotas_pendientes (sin bajar de 0)
                    if credito.cuotas_pendientes is not None and credito.cuotas_pendientes > 0:
                        credito.cuotas_pendientes = max(0, credito.cuotas_pendientes - 1)
                    # disminuir monto_pendiente (sin bajar de 0)
                    if credito.monto_pendiente is None:
                        credito.monto_pendiente = credito.monto_total
                    try:
                        credito.monto_pendiente = max(Decimal('0.00'), credito.monto_pendiente - cuota.monto)
                    except Exception:
                        # Fallback: cast to Decimal
                        credito.monto_pendiente = max(Decimal('0.00'), Decimal(str(credito.monto_pendiente)) - Decimal(str(cuota.monto)))
                    
                    # ✅ CAMBIAR ESTADO A FINALIZADO SI MONTO PENDIENTE = 0
                    if credito.monto_pendiente == Decimal('0.00'):
                        credito.estado_id = 1  # ID del estado "Finalizado"
                    
                    credito.full_clean()
                    credito.save()

                # Si la cuota pertenece a un apartado
                if cuota.apartado:
                    apartado = cuota.apartado
                    if apartado.cuotas_pendientes is not None and apartado.cuotas_pendientes > 0:
                        apartado.cuotas_pendientes = max(0, apartado.cuotas_pendientes - 1)
                    if apartado.monto_pendiente is None:
                        apartado.monto_pendiente = apartado.monto_total
                    try:
                        apartado.monto_pendiente = max(Decimal('0.00'), apartado.monto_pendiente - cuota.monto)
                    except Exception:
                        apartado.monto_pendiente = max(Decimal('0.00'), Decimal(str(apartado.monto_pendiente)) - Decimal(str(cuota.monto)))
                    
                    # ✅ CAMBIAR ESTADO A FINALIZADO SI MONTO PENDIENTE = 0
                    if apartado.monto_pendiente == Decimal('0.00'):
                        apartado.estado_id = 1  # ID del estado "Finalizado"
                    
                    apartado.full_clean()
                    apartado.save()

        except (DjangoValidationError, DRFValidationError) as e:
            # Errores de validación: devolver mensaje amigable
            return Response({"warning": e.detail if hasattr(e, 'detail') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError as e:
            return Response({"warning": "Error de integridad en la base de datos: " + str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"warning": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except (DjangoValidationError, DRFValidationError) as e:
            return Response({"error": e.message if hasattr(e, 'message') else (e.detail if hasattr(e, 'detail') else str(e))}, status=status.HTTP_400_BAD_REQUEST)

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
