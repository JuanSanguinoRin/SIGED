# caja/serializers.py
from rest_framework import serializers
from .models import (
    CuentaBancaria, 
    TipoMovimiento, 
    MovimientoCaja, 
    CierreCaja, 
    SaldoCuentaPorCierre
)
from decimal import Decimal


class CuentaBancariaSerializer(serializers.ModelSerializer):
    """
    Serializer para CuentaBancaria
    """
    saldo_actual_formateado = serializers.SerializerMethodField()
    
    class Meta:
        model = CuentaBancaria
        fields = [
            'id',
            'nombre',
            'descripcion',
            'saldo_actual',
            'saldo_actual_formateado',
            'activa',
            'fecha_creacion'
        ]
        read_only_fields = ['saldo_actual', 'fecha_creacion']
    
    def get_saldo_actual_formateado(self, obj):
        return f"${obj.saldo_actual:,.2f}"


class TipoMovimientoSerializer(serializers.ModelSerializer):
    """
    Serializer para TipoMovimiento
    """
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = TipoMovimiento
        fields = [
            'id',
            'nombre',
            'tipo',
            'tipo_display',
            'descripcion',
            'activo'
        ]


class MovimientoCajaSerializer(serializers.ModelSerializer):
    """
    Serializer básico para MovimientoCaja
    """
    cuenta_nombre = serializers.CharField(source='cuenta.nombre', read_only=True)
    tipo_movimiento_nombre = serializers.CharField(source='tipo_movimiento.nombre', read_only=True)
    tipo_movimiento_tipo = serializers.CharField(source='tipo_movimiento.tipo', read_only=True)
    monto_formateado = serializers.SerializerMethodField()
    
    class Meta:
        model = MovimientoCaja
        fields = [
            'id',
            'cuenta',
            'cuenta_nombre',
            'tipo_movimiento',
            'tipo_movimiento_nombre',
            'tipo_movimiento_tipo',
            'monto',
            'monto_formateado',
            'descripcion',
            'fecha',
            'venta',
            'compra',
            'cuota',
            'cierre_caja',
            'observaciones'
        ]
        read_only_fields = ['fecha']
    
    def get_monto_formateado(self, obj):
        return f"${obj.monto:,.2f}"
    
    def validate_monto(self, value):
        """Validar que el monto sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor a cero")
        return value
    
    def validate(self, data):
        """
        Validar que si el tipo de movimiento es SALIDA, 
        la cuenta tenga suficiente saldo
        """
        tipo_mov = data.get('tipo_movimiento')
        cuenta = data.get('cuenta')
        monto = data.get('monto')
        
        if tipo_mov and tipo_mov.tipo == TipoMovimiento.SALIDA:
            if cuenta.saldo_actual < monto:
                raise serializers.ValidationError({
                    'monto': f'Saldo insuficiente en {cuenta.nombre}. '
                             f'Saldo disponible: ${cuenta.saldo_actual:,.2f}'
                })
        
        return data


class MovimientoCajaDetalladoSerializer(serializers.ModelSerializer):
    """
    Serializer detallado para MovimientoCaja con información relacionada
    """
    cuenta = CuentaBancariaSerializer(read_only=True)
    tipo_movimiento = TipoMovimientoSerializer(read_only=True)
    monto_formateado = serializers.SerializerMethodField()
    
    # Información relacionada opcional
    venta_info = serializers.SerializerMethodField()
    compra_info = serializers.SerializerMethodField()
    cuota_info = serializers.SerializerMethodField()
    egreso_info = serializers.SerializerMethodField()
    ingreso_info = serializers.SerializerMethodField()
    
    class Meta:
        model = MovimientoCaja
        fields = [
            'id',
            'cuenta',
            'tipo_movimiento',
            'monto',
            'monto_formateado',
            'descripcion',
            'fecha',
            'venta_info',
            'compra_info',
            'cuota_info',
            'egreso_info',  
            'ingreso_info', 
            'cierre_caja',
            'observaciones'
        ]
    
    def get_monto_formateado(self, obj):
        return f"${obj.monto:,.2f}"
    
    def get_venta_info(self, obj):
        if obj.venta:
            return {
                'id': obj.venta.id,
                'fecha': obj.venta.fecha,
                'total': str(obj.venta.total)
            }
        return None
    
    def get_compra_info(self, obj):
        if obj.compra:
            return {
                'id': obj.compra.id,
                'fecha': obj.compra.fecha,
                'total': str(obj.compra.total)
            }
        return None
    
    def get_cuota_info(self, obj):
        if obj.cuota:
            return {
                'id': obj.cuota.id,
                'monto': str(obj.cuota.monto),
                'fecha': obj.cuota.fecha
            }
        return None
    
    def get_egreso_info(self, obj):
        if obj.egreso:
            return {
                'id': obj.egreso.id,
                'descripcion': obj.egreso.descripcion,
                'monto': str(obj.egreso.monto),
                'fecha': obj.egreso.fecha_registro
            }
        return None
    
    def get_ingreso_info(self, obj):
        if obj.ingreso:
            return {
                'id': obj.ingreso.id,
                'descripcion': obj.ingreso.descripcion,
                'monto': str(obj.ingreso.monto),
                'fecha': obj.ingreso.fecha_registro
            }
        return None


class SaldoCuentaPorCierreSerializer(serializers.ModelSerializer):
    """
    Serializer para SaldoCuentaPorCierre
    """
    cuenta_nombre = serializers.CharField(source='cuenta.nombre', read_only=True)
    saldo_formateado = serializers.SerializerMethodField()
    
    class Meta:
        model = SaldoCuentaPorCierre
        fields = [
            'id',
            'cuenta',
            'cuenta_nombre',
            'saldo',
            'saldo_formateado'
        ]
    
    def get_saldo_formateado(self, obj):
        return f"${obj.saldo:,.2f}"


class CierreCajaSerializer(serializers.ModelSerializer):
    """
    Serializer básico para CierreCaja
    """
    tipo_cierre_display = serializers.CharField(source='get_tipo_cierre_display', read_only=True)
    total_entradas_formateado = serializers.SerializerMethodField()
    total_salidas_formateado = serializers.SerializerMethodField()
    saldo_inicial_formateado = serializers.SerializerMethodField()
    saldo_final_formateado = serializers.SerializerMethodField()
    diferencia = serializers.SerializerMethodField()
    
    class Meta:
        model = CierreCaja
        fields = [
            'id',
            'tipo_cierre',
            'tipo_cierre_display',
            'fecha_inicio',
            'fecha_fin',
            'fecha_cierre',
            'total_entradas',
            'total_entradas_formateado',
            'total_salidas',
            'total_salidas_formateado',
            'saldo_inicial',
            'saldo_inicial_formateado',
            'saldo_final',
            'saldo_final_formateado',
            'diferencia',
            'observaciones',
            'cerrado_por'
        ]
        read_only_fields = ['fecha_cierre']
    
    def get_total_entradas_formateado(self, obj):
        return f"${obj.total_entradas:,.2f}"
    
    def get_total_salidas_formateado(self, obj):
        return f"${obj.total_salidas:,.2f}"
    
    def get_saldo_inicial_formateado(self, obj):
        return f"${obj.saldo_inicial:,.2f}"
    
    def get_saldo_final_formateado(self, obj):
        return f"${obj.saldo_final:,.2f}"
    
    def get_diferencia(self, obj):
        """Calcula la diferencia entre entradas y salidas"""
        diferencia = obj.total_entradas - obj.total_salidas
        return {
            'valor': str(diferencia),
            'formateado': f"${diferencia:,.2f}"
        }


class CierreCajaDetalladoSerializer(serializers.ModelSerializer):
    """
    Serializer detallado para CierreCaja con saldos por cuenta y movimientos
    """
    tipo_cierre_display = serializers.CharField(source='get_tipo_cierre_display', read_only=True)
    saldos_cuentas = SaldoCuentaPorCierreSerializer(many=True, read_only=True)
    movimientos = MovimientoCajaSerializer(many=True, read_only=True)
    total_entradas_formateado = serializers.SerializerMethodField()
    total_salidas_formateado = serializers.SerializerMethodField()
    saldo_inicial_formateado = serializers.SerializerMethodField()
    saldo_final_formateado = serializers.SerializerMethodField()
    cantidad_movimientos = serializers.SerializerMethodField()
    
    class Meta:
        model = CierreCaja
        fields = [
            'id',
            'tipo_cierre',
            'tipo_cierre_display',
            'fecha_inicio',
            'fecha_fin',
            'fecha_cierre',
            'total_entradas',
            'total_entradas_formateado',
            'total_salidas',
            'total_salidas_formateado',
            'saldo_inicial',
            'saldo_inicial_formateado',
            'saldo_final',
            'saldo_final_formateado',
            'saldos_cuentas',
            'movimientos',
            'cantidad_movimientos',
            'observaciones',
            'cerrado_por'
        ]
    
    def get_total_entradas_formateado(self, obj):
        return f"${obj.total_entradas:,.2f}"
    
    def get_total_salidas_formateado(self, obj):
        return f"${obj.total_salidas:,.2f}"
    
    def get_saldo_inicial_formateado(self, obj):
        return f"${obj.saldo_inicial:,.2f}"
    
    def get_saldo_final_formateado(self, obj):
        return f"${obj.saldo_final:,.2f}"
    
    def get_cantidad_movimientos(self, obj):
        return obj.movimientos.count()


class CrearMovimientoCajaSerializer(serializers.Serializer):
    """
    Serializer específico para crear movimientos de caja manualmente
    """
    cuenta_id = serializers.IntegerField()
    tipo_movimiento_id = serializers.IntegerField()
    monto = serializers.DecimalField(max_digits=15, decimal_places=2)
    descripcion = serializers.CharField()
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    def validate_monto(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor a cero")
        return value
    
    def validate_cuenta_id(self, value):
        try:
            cuenta = CuentaBancaria.objects.get(id=value)
            if not cuenta.activa:
                raise serializers.ValidationError("La cuenta no está activa")
        except CuentaBancaria.DoesNotExist:
            raise serializers.ValidationError("La cuenta no existe")
        return value
    
    def validate_tipo_movimiento_id(self, value):
        try:
            tipo = TipoMovimiento.objects.get(id=value)
            if not tipo.activo:
                raise serializers.ValidationError("El tipo de movimiento no está activo")
        except TipoMovimiento.DoesNotExist:
            raise serializers.ValidationError("El tipo de movimiento no existe")
        return value
    
    def validate(self, data):
        """Validar saldo suficiente para salidas"""
        cuenta = CuentaBancaria.objects.get(id=data['cuenta_id'])
        tipo_mov = TipoMovimiento.objects.get(id=data['tipo_movimiento_id'])
        monto = data['monto']
        
        if tipo_mov.tipo == TipoMovimiento.SALIDA:
            if cuenta.saldo_actual < monto:
                raise serializers.ValidationError({
                    'monto': f'Saldo insuficiente en {cuenta.nombre}. '
                             f'Saldo disponible: ${cuenta.saldo_actual:,.2f}'
                })
        
        return data