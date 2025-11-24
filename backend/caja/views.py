# caja/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    CuentaBancaria,
    TipoMovimiento,
    MovimientoCaja,
    CierreCaja,
    SaldoCuentaPorCierre
)
from .serializers import (
    CuentaBancariaSerializer,
    TipoMovimientoSerializer,
    MovimientoCajaSerializer,
    MovimientoCajaDetalladoSerializer,
    CierreCajaSerializer,
    CierreCajaDetalladoSerializer,
    CrearMovimientoCajaSerializer
)


class CuentaBancariaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Cuentas Bancarias
    """
    queryset = CuentaBancaria.objects.all()
    serializer_class = CuentaBancariaSerializer
    
    def get_queryset(self):
        """Filtrar solo cuentas activas por defecto"""
        queryset = CuentaBancaria.objects.all()
        
        # Filtrar por activa/inactiva
        activa = self.request.query_params.get('activa', None)
        if activa is not None:
            activa_bool = activa.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(activa=activa_bool)
        
        return queryset.order_by('nombre')
    
    @action(detail=False, methods=['get'])
    def resumen_general(self, request):
        """
        Endpoint: GET /api/caja/cuentas/resumen_general/
        Retorna un resumen de todas las cuentas con sus saldos
        """
        cuentas = CuentaBancaria.objects.filter(activa=True)
        
        total_general = cuentas.aggregate(
            total=Sum('saldo_actual')
        )['total'] or Decimal('0.00')
        
        cuentas_data = []
        for cuenta in cuentas:
            cuentas_data.append({
                'id': cuenta.id,
                'nombre': cuenta.nombre,
                'saldo': str(cuenta.saldo_actual),
                'saldo_formateado': f"${cuenta.saldo_actual:,.2f}",
                'porcentaje': float((cuenta.saldo_actual / total_general * 100) if total_general > 0 else 0)
            })
        
        return Response({
            'total_general': str(total_general),
            'total_general_formateado': f"${total_general:,.2f}",
            'cuentas': cuentas_data,
            'cantidad_cuentas': len(cuentas_data)
        })
    
    @action(detail=True, methods=['get'])
    def movimientos_recientes(self, request, pk=None):
        """
        Endpoint: GET /api/caja/cuentas/{id}/movimientos_recientes/
        Retorna los últimos movimientos de una cuenta específica
        """
        cuenta = self.get_object()
        
        # Parámetros de paginación
        limite = int(request.query_params.get('limite', 20))
        
        movimientos = MovimientoCaja.objects.filter(
            cuenta=cuenta
        ).select_related(
            'tipo_movimiento', 'venta', 'compra', 'cuota'
        ).order_by('-fecha')[:limite]
        
        serializer = MovimientoCajaDetalladoSerializer(movimientos, many=True)
        
        return Response({
            'cuenta': {
                'id': cuenta.id,
                'nombre': cuenta.nombre,
                'saldo_actual': str(cuenta.saldo_actual)
            },
            'movimientos': serializer.data,
            'cantidad': len(serializer.data)
        })


class TipoMovimientoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Tipos de Movimiento
    """
    queryset = TipoMovimiento.objects.all()
    serializer_class = TipoMovimientoSerializer
    
    def get_queryset(self):
        """Filtrar por tipo (ENTRADA/SALIDA) si se especifica"""
        queryset = TipoMovimiento.objects.filter(activo=True)
        
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo.upper())
        
        return queryset.order_by('nombre')


class MovimientoCajaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Movimientos de Caja
    """
    queryset = MovimientoCaja.objects.all()
    
    def get_serializer_class(self):
        """Usar serializer detallado para retrieve y list"""
        if self.action in ['retrieve', 'list']:
            return MovimientoCajaDetalladoSerializer
        return MovimientoCajaSerializer
    
    def get_queryset(self):
        """Filtros avanzados para movimientos"""
        queryset = MovimientoCaja.objects.select_related(
            'cuenta', 'tipo_movimiento', 'cierre_caja'
        ).order_by('-fecha')
        
        # Filtrar por cuenta
        cuenta_id = self.request.query_params.get('cuenta', None)
        if cuenta_id:
            queryset = queryset.filter(cuenta_id=cuenta_id)
        
        # Filtrar por tipo de movimiento
        tipo_movimiento_id = self.request.query_params.get('tipo_movimiento', None)
        if tipo_movimiento_id:
            queryset = queryset.filter(tipo_movimiento_id=tipo_movimiento_id)
        
        # Filtrar por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            # Agregar un día para incluir todo el día seleccionado
            fecha_hasta_dt = datetime.fromisoformat(fecha_hasta) + timedelta(days=1)
            queryset = queryset.filter(fecha__lt=fecha_hasta_dt)
        
        # Filtrar solo movimientos sin cierre (movimientos actuales)
        sin_cierre = self.request.query_params.get('sin_cierre', None)
        if sin_cierre and sin_cierre.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(cierre_caja__isnull=True)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def crear_movimiento(self, request):
        """
        Endpoint: POST /api/caja/movimientos/crear_movimiento/
        Crea un movimiento de caja manual
        """
        serializer = CrearMovimientoCajaSerializer(data=request.data)
        
        if serializer.is_valid():
            # Obtener objetos
            cuenta = CuentaBancaria.objects.get(id=serializer.validated_data['cuenta_id'])
            tipo_movimiento = TipoMovimiento.objects.get(id=serializer.validated_data['tipo_movimiento_id'])
            
            # Crear movimiento
            movimiento = MovimientoCaja.objects.create(
                cuenta=cuenta,
                tipo_movimiento=tipo_movimiento,
                monto=serializer.validated_data['monto'],
                descripcion=serializer.validated_data['descripcion'],
                observaciones=serializer.validated_data.get('observaciones', '')
            )
            
            return Response(
                MovimientoCajaDetalladoSerializer(movimiento).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def resumen_periodo(self, request):
        """
        Endpoint: GET /api/caja/movimientos/resumen_periodo/
        Retorna resumen de movimientos en un período
        """
        # Parámetros de fecha
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        if not fecha_desde or not fecha_hasta:
            return Response(
                {'error': 'Debe proporcionar fecha_desde y fecha_hasta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convertir fechas
        fecha_hasta_dt = datetime.fromisoformat(fecha_hasta) + timedelta(days=1)
        
        # Filtrar movimientos del período
        movimientos = MovimientoCaja.objects.filter(
            fecha__gte=fecha_desde,
            fecha__lt=fecha_hasta_dt
        )
        
        # Calcular totales por tipo
        entradas = movimientos.filter(
            tipo_movimiento__tipo=TipoMovimiento.ENTRADA
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        
        salidas = movimientos.filter(
            tipo_movimiento__tipo=TipoMovimiento.SALIDA
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        
        diferencia = entradas - salidas
        
        # Resumen por cuenta
        cuentas_resumen = []
        for cuenta in CuentaBancaria.objects.filter(activa=True):
            movs_cuenta = movimientos.filter(cuenta=cuenta)
            
            entradas_cuenta = movs_cuenta.filter(
                tipo_movimiento__tipo=TipoMovimiento.ENTRADA
            ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
            
            salidas_cuenta = movs_cuenta.filter(
                tipo_movimiento__tipo=TipoMovimiento.SALIDA
            ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
            
            cuentas_resumen.append({
                'cuenta': cuenta.nombre,
                'entradas': str(entradas_cuenta),
                'entradas_formateado': f"${entradas_cuenta:,.2f}",
                'salidas': str(salidas_cuenta),
                'salidas_formateado': f"${salidas_cuenta:,.2f}",
                'diferencia': str(entradas_cuenta - salidas_cuenta),
                'diferencia_formateado': f"${(entradas_cuenta - salidas_cuenta):,.2f}"
            })
        
        # Resumen por tipo de movimiento
        tipos_resumen = []
        for tipo in TipoMovimiento.objects.filter(activo=True):
            total_tipo = movimientos.filter(
                tipo_movimiento=tipo
            ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
            
            if total_tipo > 0:
                tipos_resumen.append({
                    'tipo': tipo.nombre,
                    'clasificacion': tipo.get_tipo_display(),
                    'total': str(total_tipo),
                    'total_formateado': f"${total_tipo:,.2f}",
                    'cantidad_movimientos': movimientos.filter(tipo_movimiento=tipo).count()
                })
        
        return Response({
            'periodo': {
                'fecha_desde': fecha_desde,
                'fecha_hasta': fecha_hasta
            },
            'resumen_general': {
                'total_entradas': str(entradas),
                'total_entradas_formateado': f"${entradas:,.2f}",
                'total_salidas': str(salidas),
                'total_salidas_formateado': f"${salidas:,.2f}",
                'diferencia': str(diferencia),
                'diferencia_formateado': f"${diferencia:,.2f}",
                'cantidad_movimientos': movimientos.count()
            },
            'por_cuenta': cuentas_resumen,
            'por_tipo_movimiento': tipos_resumen
        })


class CierreCajaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Cierres de Caja
    """
    queryset = CierreCaja.objects.all()
    
    def get_serializer_class(self):
        """Usar serializer detallado para retrieve"""
        if self.action == 'retrieve':
            return CierreCajaDetalladoSerializer
        return CierreCajaSerializer
    
    def get_queryset(self):
        """Filtrar por tipo de cierre si se especifica"""
        queryset = CierreCaja.objects.all().order_by('-fecha_cierre')
        
        tipo_cierre = self.request.query_params.get('tipo_cierre', None)
        if tipo_cierre:
            queryset = queryset.filter(tipo_cierre=tipo_cierre.upper())
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def realizar_cierre(self, request):
        """
        Endpoint: POST /api/caja/cierres/realizar_cierre/
        Realiza un cierre de caja
        
        Body:
        {
            "tipo_cierre": "D" o "M",
            "fecha_inicio": "2024-01-01T00:00:00",
            "fecha_fin": "2024-01-31T23:59:59",
            "observaciones": "...",
            "cerrado_por": "Nombre del usuario"
        }
        """
        tipo_cierre = request.data.get('tipo_cierre')
        fecha_inicio = request.data.get('fecha_inicio')
        fecha_fin = request.data.get('fecha_fin')
        observaciones = request.data.get('observaciones', '')
        cerrado_por = request.data.get('cerrado_por', '')
        
        # Validaciones
        if not tipo_cierre or tipo_cierre not in ['D', 'M']:
            return Response(
                {'error': 'Tipo de cierre inválido. Debe ser D (Diario) o M (Mensual)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not fecha_inicio or not fecha_fin:
            return Response(
                {'error': 'Debe proporcionar fecha_inicio y fecha_fin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha_inicio_dt = datetime.fromisoformat(fecha_inicio)
            fecha_fin_dt = datetime.fromisoformat(fecha_fin)
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use ISO format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que no haya movimientos ya cerrados en este período
        movimientos_ya_cerrados = MovimientoCaja.objects.filter(
            fecha__gte=fecha_inicio_dt,
            fecha__lte=fecha_fin_dt,
            cierre_caja__isnull=False
        ).exists()
        
        if movimientos_ya_cerrados:
            return Response(
                {'error': 'Ya existe un cierre que incluye movimientos de este período'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener movimientos del período sin cierre
        movimientos = MovimientoCaja.objects.filter(
            fecha__gte=fecha_inicio_dt,
            fecha__lte=fecha_fin_dt,
            cierre_caja__isnull=True
        )
        
        if not movimientos.exists():
            return Response(
                {'error': 'No hay movimientos para cerrar en este período'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calcular totales
        total_entradas = movimientos.filter(
            tipo_movimiento__tipo=TipoMovimiento.ENTRADA
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        
        total_salidas = movimientos.filter(
            tipo_movimiento__tipo=TipoMovimiento.SALIDA
        ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
        
        # Calcular saldo inicial (suma de saldos antes del período)
        saldo_inicial = Decimal('0.00')
        for cuenta in CuentaBancaria.objects.filter(activa=True):
            movs_anteriores_entrada = MovimientoCaja.objects.filter(
                cuenta=cuenta,
                fecha__lt=fecha_inicio_dt,
                tipo_movimiento__tipo=TipoMovimiento.ENTRADA
            ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
            
            movs_anteriores_salida = MovimientoCaja.objects.filter(
                cuenta=cuenta,
                fecha__lt=fecha_inicio_dt,
                tipo_movimiento__tipo=TipoMovimiento.SALIDA
            ).aggregate(total=Sum('monto'))['total'] or Decimal('0.00')
            
            saldo_inicial += (movs_anteriores_entrada - movs_anteriores_salida)
        
        # Saldo final = saldo inicial + entradas - salidas
        saldo_final = saldo_inicial + total_entradas - total_salidas
        
        # Crear el cierre
        cierre = CierreCaja.objects.create(
            tipo_cierre=tipo_cierre,
            fecha_inicio=fecha_inicio_dt,
            fecha_fin=fecha_fin_dt,
            total_entradas=total_entradas,
            total_salidas=total_salidas,
            saldo_inicial=saldo_inicial,
            saldo_final=saldo_final,
            observaciones=observaciones,
            cerrado_por=cerrado_por
        )
        
        # Asociar movimientos al cierre
        movimientos.update(cierre_caja=cierre)
        
        # Guardar saldos de cada cuenta en el momento del cierre
        for cuenta in CuentaBancaria.objects.filter(activa=True):
            SaldoCuentaPorCierre.objects.create(
                cierre_caja=cierre,
                cuenta=cuenta,
                saldo=cuenta.saldo_actual
            )
        
        serializer = CierreCajaDetalladoSerializer(cierre)
        
        return Response({
            'message': 'Cierre de caja realizado exitosamente',
            'cierre': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def ultimo_cierre(self, request):
        """
        Endpoint: GET /api/caja/cierres/ultimo_cierre/
        Retorna el último cierre realizado
        """
        tipo_cierre = request.query_params.get('tipo_cierre', None)
        
        queryset = CierreCaja.objects.all()
        if tipo_cierre:
            queryset = queryset.filter(tipo_cierre=tipo_cierre.upper())
        
        ultimo = queryset.order_by('-fecha_cierre').first()
        
        if not ultimo:
            return Response(
                {'message': 'No hay cierres registrados'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = CierreCajaDetalladoSerializer(ultimo)
        return Response(serializer.data)