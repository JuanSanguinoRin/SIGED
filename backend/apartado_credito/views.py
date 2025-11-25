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

from rest_framework.decorators import action, api_view  # ← AGREGAR api_view
from compra_venta.models import Venta, Compra  # ← AGREGAR Compra
from compra_venta.serializers import VentaSerializer
from django.db.models import Prefetch, Q  # ← AGREGAR estos


class ApartadoViewSet(viewsets.ModelViewSet):
    queryset = Apartado.objects.all()
    serializer_class = ApartadoSerializer


    def get_queryset(self):
        """Verificar estados vencidos antes de devolver resultados"""
        queryset = super().get_queryset()
        
        # Verificar estados solo para apartados en proceso
        from apartado_credito.models import ESTADO_EN_PROCESO
        for apartado in queryset.filter(estado_id=ESTADO_EN_PROCESO):
            apartado.verificar_y_actualizar_estado()
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Verificar estado al obtener un apartado específico"""
        instance = self.get_object()
        instance.verificar_y_actualizar_estado()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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

    def get_queryset(self):
        """Verificar estados vencidos antes de devolver resultados"""
        queryset = super().get_queryset()
        
        # Verificar estados solo para créditos en proceso
        from apartado_credito.models import ESTADO_EN_PROCESO
        for credito in queryset.filter(estado_id=ESTADO_EN_PROCESO):
            credito.verificar_y_actualizar_estado()
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Verificar estado al obtener un crédito específico"""
        instance = self.get_object()
        instance.verificar_y_actualizar_estado()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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

                # ✅ DISPARAR SIGNAL MANUALMENTE DESPUÉS DE ACTUALIZAR TODO
                from caja.signals import registrar_cuota_en_caja
                registrar_cuota_en_caja(Cuota, cuota, created=True)

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
@api_view(['GET'])
def deudas_por_cobrar_optimizado(request):
    """
    Endpoint optimizado que trae TODOS los datos en una sola consulta.
    GET /api/apartado_credito/deudas-por-cobrar-optimizado/
    """
    # Prefetch para evitar N+1
    ventas = Venta.objects.select_related(
        'cliente', 'credito', 'credito__estado', 'apartado', 'apartado__estado', 'metodo_pago'
    ).prefetch_related(
        'prendas__prenda',
        Prefetch('credito__cuotas', queryset=Cuota.objects.select_related('metodo_pago')),
        Prefetch('apartado__cuotas', queryset=Cuota.objects.select_related('metodo_pago'))
    ).filter(
        Q(credito__isnull=False) | Q(apartado__isnull=False)
    )
    
    # Agrupar por cliente
    clientes_dict = {}
    for venta in ventas:
        cliente_id = venta.cliente.id
        if cliente_id not in clientes_dict:
            clientes_dict[cliente_id] = {
                'cliente': {
                    'id': venta.cliente.id,
                    'nombre': venta.cliente.nombre or '',
                    'cedula': getattr(venta.cliente, 'cedula', None) or getattr(venta.cliente, 'identificacion', None),
                },
                'deudas': []
            }
        
        # Construir deuda
        if venta.credito:
            deuda = {
                'venta_id': venta.id,
                'venta': {
                    'id': venta.id,
                    'fecha': venta.fecha,
                    'total': str(venta.total),
                    'prendas': [
                        {
                            'prenda_nombre': p.prenda.nombre,
                            'cantidad': p.cantidad,
                            'subtotal': str(p.subtotal)
                        } for p in venta.prendas.all()
                    ]
                },
                'tipo': 'Crédito',
                'total': str(venta.total),
                'cuotas_pendientes': venta.credito.cuotas_pendientes,
                'fecha_limite': venta.credito.fecha_limite,
                'estado': venta.credito.estado.nombre if venta.credito.estado else None,
                'credito_id': venta.credito.id,
                'monto_pendiente': str(venta.credito.monto_pendiente),
                'cantidad_cuotas': venta.credito.cantidad_cuotas,
                'interes': str(venta.credito.interes),
                'descripcion': venta.credito.descripcion,
                'abonos': [
                    {
                        'id': c.id,
                        'fecha': c.fecha,
                        'monto': str(c.monto),
                        'metodo_pago_nombre': c.metodo_pago.nombre if c.metodo_pago else None
                    } for c in venta.credito.cuotas.all()
                ]
            }
            clientes_dict[cliente_id]['deudas'].append(deuda)
        
        elif venta.apartado:
            deuda = {
                'venta_id': venta.id,
                'venta': {
                    'id': venta.id,
                    'fecha': venta.fecha,
                    'total': str(venta.total),
                    'prendas': [
                        {
                            'prenda_nombre': p.prenda.nombre,
                            'cantidad': p.cantidad,
                            'subtotal': str(p.subtotal)
                        } for p in venta.prendas.all()
                    ]
                },
                'tipo': 'Apartado',
                'total': str(venta.total),
                'cuotas_pendientes': venta.apartado.cuotas_pendientes,
                'fecha_limite': venta.apartado.fecha_limite,
                'estado': venta.apartado.estado.nombre if venta.apartado.estado else None,
                'apartado_id': venta.apartado.id,
                'monto_pendiente': str(venta.apartado.monto_pendiente),
                'cantidad_cuotas': venta.apartado.cantidad_cuotas,
                'descripcion': venta.apartado.descripcion,
                'abonos': [
                    {
                        'id': c.id,
                        'fecha': c.fecha,
                        'monto': str(c.monto),
                        'metodo_pago_nombre': c.metodo_pago.nombre if c.metodo_pago else None
                    } for c in venta.apartado.cuotas.all()
                ]
            }
            clientes_dict[cliente_id]['deudas'].append(deuda)
    
    return Response(list(clientes_dict.values()))


@api_view(['GET'])
def deudas_por_pagar_optimizado(request):
    """
    Endpoint optimizado para deudas por pagar (proveedores).
    GET /api/apartado_credito/deudas-por-pagar-optimizado/
    """
    compras = Compra.objects.select_related(
        'proveedor', 'credito', 'credito__estado', 'metodo_pago'
    ).prefetch_related(
        'prendas__prenda',
        Prefetch('credito__cuotas', queryset=Cuota.objects.select_related('metodo_pago'))
    ).filter(credito__isnull=False)
    
    proveedores_dict = {}
    for compra in compras:
        proveedor_id = compra.proveedor.id
        if proveedor_id not in proveedores_dict:
            proveedores_dict[proveedor_id] = {
                'proveedor': {
                    'id': compra.proveedor.id,
                    'nombre': compra.proveedor.nombre,
                    'telefono': compra.proveedor.telefono,
                },
                'deudas': []
            }
        
        if compra.credito:
            deuda = {
                'compra_id': compra.id,
                'compra': {
                    'id': compra.id,
                    'fecha': compra.fecha,
                    'total': str(compra.total),
                    'prendas': [
                        {
                            'prenda_nombre': p.prenda.nombre,
                            'cantidad': p.cantidad,
                            'subtotal': str(p.subtotal)
                        } for p in compra.prendas.all()
                    ]
                },
                'tipo': 'Crédito',
                'total': str(compra.total),
                'cuotas_pendientes': compra.credito.cuotas_pendientes,
                'fecha_limite': compra.credito.fecha_limite,
                'estado': compra.credito.estado.nombre if compra.credito.estado else None,
                'credito_id': compra.credito.id,
                'monto_pendiente': str(compra.credito.monto_pendiente),
                'cantidad_cuotas': compra.credito.cantidad_cuotas,
                'interes': str(compra.credito.interes),
                'descripcion': compra.credito.descripcion,
                'abonos': [
                    {
                        'id': c.id,
                        'fecha': c.fecha,
                        'monto': str(c.monto),
                        'metodo_pago_nombre': c.metodo_pago.nombre if c.metodo_pago else None
                    } for c in compra.credito.cuotas.all()
                ]
            }
            proveedores_dict[proveedor_id]['deudas'].append(deuda)
    
    return Response(list(proveedores_dict.values()))