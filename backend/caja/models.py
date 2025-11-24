# caja/models.py
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class CuentaBancaria(models.Model):
    """
    Representa las diferentes cuentas donde se maneja el dinero
    Ejemplos: Efectivo, Bancolombia, Nequi, Davivienda, etc.
    """
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    saldo_actual = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'caja_cuenta_bancaria'
        verbose_name = 'Cuenta Bancaria'
        verbose_name_plural = 'Cuentas Bancarias'
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} - ${self.saldo_actual:,.2f}"


class TipoMovimiento(models.Model):
    """
    Tipos de movimientos que afectan la caja
    Ejemplos: Venta, Compra, Gasto, Ingreso, Abono Cliente, Abono Proveedor
    """
    ENTRADA = 'E'
    SALIDA = 'S'
    TIPO_CHOICES = [
        (ENTRADA, 'Entrada'),
        (SALIDA, 'Salida'),
    ]
    
    nombre = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=1, choices=TIPO_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'caja_tipo_movimiento'
        verbose_name = 'Tipo de Movimiento'
        verbose_name_plural = 'Tipos de Movimientos'
    
    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"


class CierreCaja(models.Model):
    """
    Representa un cierre de caja (diario o mensual).
    Congela los movimientos de un período específico.
    """
    DIARIO = 'D'
    MENSUAL = 'M'
    TIPO_CIERRE_CHOICES = [
        (DIARIO, 'Diario'),
        (MENSUAL, 'Mensual'),
    ]
    
    tipo_cierre = models.CharField(max_length=1, choices=TIPO_CIERRE_CHOICES)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    fecha_cierre = models.DateTimeField(auto_now_add=True)
    
    total_entradas = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_salidas = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    saldo_inicial = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    saldo_final = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    observaciones = models.TextField(blank=True, null=True)
    cerrado_por = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        db_table = 'caja_cierre'
        verbose_name = 'Cierre de Caja'
        verbose_name_plural = 'Cierres de Caja'
        ordering = ['-fecha_cierre']
    
    def __str__(self):
        return f"Cierre {self.get_tipo_cierre_display()} - {self.fecha_fin.strftime('%Y-%m-%d')}"


class MovimientoCaja(models.Model):
    """
    Registro de cada movimiento de dinero que ocurre en el negocio.
    """
    cuenta = models.ForeignKey(
        CuentaBancaria, 
        on_delete=models.PROTECT,
        related_name='movimientos'
    )
    tipo_movimiento = models.ForeignKey(
        TipoMovimiento, 
        on_delete=models.PROTECT,
        related_name='movimientos'
    )
    
    monto = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    
    # Referencias opcionales para trazabilidad
    venta = models.ForeignKey(
        'compra_venta.Venta', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='movimientos_caja'
    )
    compra = models.ForeignKey(
        'compra_venta.Compra', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='movimientos_caja'
    )
    cuota = models.ForeignKey(
        'apartado_credito.Cuota', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='movimientos_caja'
    )
    
    cierre_caja = models.ForeignKey(
        CierreCaja, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='movimientos'
    )
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'caja_movimiento'
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['-fecha']),
            models.Index(fields=['cuenta', '-fecha']),
        ]
    
    def __str__(self):
        return f"{self.tipo_movimiento.nombre} - ${self.monto:,.2f} - {self.fecha.strftime('%Y-%m-%d %H:%M')}"
    
    def save(self, *args, **kwargs):
        """
        Al guardar, actualiza el saldo de la cuenta automáticamente
        """
        es_nuevo = self.pk is None
        
        print(f"🔍 [SAVE] Guardando movimiento - es_nuevo: {es_nuevo}")
        print(f"   - Monto: {self.monto}")
        print(f"   - Tipo: {self.tipo_movimiento.tipo}")
        print(f"   - Cuenta: {self.cuenta.nombre}")
        print(f"   - Saldo actual cuenta ANTES: {self.cuenta.saldo_actual}")
        
        if es_nuevo:
            # Convertir a Decimal para asegurar precisión
            monto_decimal = Decimal(str(self.monto))
            
            # Actualizar saldo según tipo de movimiento
            if self.tipo_movimiento.tipo == TipoMovimiento.ENTRADA:
                self.cuenta.saldo_actual += monto_decimal
                print(f"   ✅ ENTRADA: Sumando {monto_decimal}")
            else:  # SALIDA
                self.cuenta.saldo_actual -= monto_decimal
                print(f"   ✅ SALIDA: Restando {monto_decimal}")
            
            self.cuenta.save()
            print(f"   - Saldo actual cuenta DESPUÉS: {self.cuenta.saldo_actual}")
        
        super().save(*args, **kwargs)
        print(f"   ✅ Movimiento guardado exitosamente")


class SaldoCuentaPorCierre(models.Model):
    """
    Guarda el saldo de cada cuenta en cada cierre de caja.
    """
    cierre_caja = models.ForeignKey(
        CierreCaja, 
        on_delete=models.CASCADE,
        related_name='saldos_cuentas'
    )
    cuenta = models.ForeignKey(
        CuentaBancaria, 
        on_delete=models.PROTECT,
        related_name='saldos_historicos'
    )
    saldo = models.DecimalField(max_digits=15, decimal_places=2)
    
    class Meta:
        db_table = 'caja_saldo_cuenta_cierre'
        verbose_name = 'Saldo de Cuenta por Cierre'
        verbose_name_plural = 'Saldos de Cuentas por Cierre'
        unique_together = ['cierre_caja', 'cuenta']
    
    def __str__(self):
        return f"{self.cuenta.nombre}: ${self.saldo:,.2f} ({self.cierre_caja})"