# caja/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal

from compra_venta.models import Venta, Compra
from apartado_credito.models import Cuota
from .models import (
    MovimientoCaja, 
    TipoMovimiento, 
    CuentaBancaria
)


def obtener_cuenta_por_metodo_pago(metodo_pago):
    """
    Busca la cuenta bancaria que corresponde al método de pago.
    """
    if not metodo_pago:
        cuenta, _ = CuentaBancaria.objects.get_or_create(
            nombre='Efectivo',
            defaults={'descripcion': 'Dinero en efectivo'}
        )
        return cuenta
    
    mapeo_nombres = {
        'Efectivo': 'Efectivo',
        'Transferencia A Cuenta Ahorros': 'Transferencia A Cuenta Ahorros',
        'Daviplata': 'Daviplata',
        'Nequi': 'Nequi',
        'Addi': 'Addi',
        'Sistecredito': 'Sistecredito',
    }
    
    nombre_cuenta = mapeo_nombres.get(metodo_pago.nombre, 'Efectivo')
    
    cuenta, _ = CuentaBancaria.objects.get_or_create(
        nombre=nombre_cuenta,
        defaults={'descripcion': f'Cuenta para {nombre_cuenta}'}
    )
    
    return cuenta


@receiver(post_save, sender=Venta)
def registrar_venta_en_caja(sender, instance, created, **kwargs):
    """
    Registra ventas en caja automáticamente.
    Solo para ventas de contado (sin crédito ni apartado).
    """
    if not created:
        return
    
    # ✅ NUEVO: Verificar que la venta tenga un total > 0
    # Esto evita que se registre antes de calcular el total
    if instance.total <= Decimal('0.00'):
        print(f"⚠️ [SIGNAL VENTA] Venta #{instance.id} tiene total 0, esperando...")
        return
    
    # ✅ EVITAR DUPLICADOS (importante para llamadas manuales)
    if MovimientoCaja.objects.filter(venta=instance).exists():
        print(f"⚠️ [SIGNAL VENTA] Venta #{instance.id} ya tiene movimiento registrado")
        return
    
    if MovimientoCaja.objects.filter(venta=instance).exists():
        return
    
    # Solo ventas SIN crédito y SIN apartado
    if instance.credito is None and instance.apartado is None:
        try:
            tipo_movimiento, _ = TipoMovimiento.objects.get_or_create(
                nombre='Venta Contado',
                defaults={
                    'tipo': TipoMovimiento.ENTRADA,
                    'descripcion': 'Ingreso por venta pagada de contado completo'
                }
            )
            
            cuenta = obtener_cuenta_por_metodo_pago(instance.metodo_pago)
            monto_venta = Decimal(str(instance.total))
            
            print(f"🔍 [SIGNAL VENTA] Venta #{instance.id}")
            print(f"   - Total original: {instance.total} (tipo: {type(instance.total)})")
            print(f"   - Monto convertido: {monto_venta} (tipo: {type(monto_venta)})")
            print(f"   - Cuenta: {cuenta.nombre}")
            
            movimiento = MovimientoCaja.objects.create(
                cuenta=cuenta,
                tipo_movimiento=tipo_movimiento,
                monto=monto_venta,
                descripcion=f'Venta #{instance.id} - Cliente: {instance.cliente}',
                venta=instance,
                observaciones=f'Venta de contado. Método: {instance.metodo_pago.nombre if instance.metodo_pago else "Efectivo"}'
            )
            
            print(f"✅ [SIGNAL VENTA] Movimiento #{movimiento.id} creado - Monto guardado: {movimiento.monto}")
            
        except Exception as e:
            print(f"❌ [SIGNAL VENTA] Error: {e}")
            import traceback
            traceback.print_exc()


@receiver(post_save, sender=Compra)
def registrar_compra_en_caja(sender, instance, created, **kwargs):
    """
    Registra compras en caja automáticamente.
    Solo para compras de contado (sin crédito).
    """
    # ✅ Verificar que la compra tenga un total > 0
    if instance.total <= Decimal('0.00'):
        print(f"⚠️ [SIGNAL COMPRA] Compra #{instance.id} tiene total 0, esperando...")
        return
    
    # ✅ EVITAR DUPLICADOS
    if MovimientoCaja.objects.filter(compra=instance).exists():
        print(f"⚠️ [SIGNAL COMPRA] Compra #{instance.id} ya tiene movimiento registrado")
        return
    
    # Solo compras SIN crédito
    if instance.credito is None:
        try:
            tipo_movimiento, _ = TipoMovimiento.objects.get_or_create(
                nombre='Compra Contado',
                defaults={
                    'tipo': TipoMovimiento.SALIDA,
                    'descripcion': 'Egreso por compra pagada de contado completo a proveedor'
                }
            )
            
            cuenta = obtener_cuenta_por_metodo_pago(instance.metodo_pago)
            
            # ✅ CRÍTICO: Convertir explícitamente a Decimal
            monto_compra = Decimal(str(instance.total))
            
            print(f"🔍 [SIGNAL COMPRA] Compra #{instance.id}")
            print(f"   - Total original: {instance.total} (tipo: {type(instance.total)})")
            print(f"   - Monto convertido: {monto_compra} (tipo: {type(monto_compra)})")
            print(f"   - Cuenta: {cuenta.nombre}")
            
            movimiento = MovimientoCaja.objects.create(
                cuenta=cuenta,
                tipo_movimiento=tipo_movimiento,
                monto=monto_compra,  # ✅ Usar el Decimal convertido
                descripcion=f'Compra #{instance.id} - Proveedor: {instance.proveedor}',
                compra=instance,
                observaciones=f'Compra de contado. Método: {instance.metodo_pago.nombre if instance.metodo_pago else "Efectivo"}'
            )
            
            print(f"✅ [SIGNAL COMPRA] Movimiento #{movimiento.id} creado - Monto guardado: {movimiento.monto}")
            
        except Exception as e:
            print(f"❌ [SIGNAL COMPRA] Error: {e}")
            import traceback
            traceback.print_exc()


@receiver(post_save, sender=Cuota)
def registrar_cuota_en_caja(sender, instance, created, **kwargs):
    """
    Registra cuotas/abonos en caja automáticamente.
    """
    if not created:
        return
    
    # ✅ EVITAR DUPLICADOS
    if MovimientoCaja.objects.filter(cuota=instance).exists():
        print(f"⚠️ [SIGNAL CUOTA] Cuota #{instance.id} ya tiene movimiento registrado")
        return
    
    try:
        cuenta = obtener_cuenta_por_metodo_pago(instance.metodo_pago)
        monto_cuota = Decimal(str(instance.monto))
        
        # Determinar tipo de cuota
        if instance.credito:
            credito = instance.credito
            
            # ✅ CORREGIDO: Usar .ventas (plural) y .exists()
            if credito.ventas.exists():
                # Crédito de VENTA → Cliente nos paga (ENTRADA)
                tipo_movimiento, _ = TipoMovimiento.objects.get_or_create(
                    nombre='Abono Cliente Crédito',
                    defaults={
                        'tipo': TipoMovimiento.ENTRADA,
                        'descripcion': 'Ingreso por abono/cuota de cliente con crédito'
                    }
                )
                
                venta = credito.ventas.first()  # ✅ .ventas (plural)
                cliente = venta.cliente
                descripcion = f'Abono de cliente {cliente} - Crédito #{credito.id} - Venta #{venta.id}'
                
            # ✅ CORREGIDO: Usar .compras (plural) y .exists()
            elif credito.compras.exists():
                # Crédito de COMPRA → Pagamos a proveedor (SALIDA)
                tipo_movimiento, _ = TipoMovimiento.objects.get_or_create(
                    nombre='Abono Proveedor Crédito',
                    defaults={
                        'tipo': TipoMovimiento.SALIDA,
                        'descripcion': 'Egreso por abono/cuota a proveedor con crédito'
                    }
                )
                
                compra = credito.compras.first()  # ✅ .compras (plural)
                proveedor = compra.proveedor
                descripcion = f'Abono a proveedor {proveedor} - Crédito #{credito.id} - Compra #{compra.id}'
            else:
                print(f"⚠️ [SIGNAL CUOTA] Crédito #{credito.id} sin venta/compra asociada")
                return
        
        elif instance.apartado:
            # APARTADO → Cliente nos paga (ENTRADA)
            tipo_movimiento, _ = TipoMovimiento.objects.get_or_create(
                nombre='Abono Cliente Apartado',
                defaults={
                    'tipo': TipoMovimiento.ENTRADA,
                    'descripcion': 'Ingreso por abono/cuota de cliente con apartado'
                }
            )
            
            apartado = instance.apartado
            # ✅ CORREGIDO: Usar .ventas (plural)
            venta = apartado.ventas.first()
            cliente = venta.cliente
            descripcion = f'Abono de apartado {cliente} - Apartado #{apartado.id} - Venta #{venta.id}'
        
        else:
            print(f"⚠️ [SIGNAL CUOTA] Cuota #{instance.id} sin crédito ni apartado")
            return
        
        print(f"🔍 [SIGNAL CUOTA] Cuota #{instance.id}")
        print(f"   - Monto: {monto_cuota}")
        print(f"   - Tipo: {tipo_movimiento.tipo}")
        print(f"   - Cuenta: {cuenta.nombre}")
        
        # Crear movimiento
        movimiento = MovimientoCaja.objects.create(
            cuenta=cuenta,
            tipo_movimiento=tipo_movimiento,
            monto=monto_cuota,
            descripcion=descripcion,
            cuota=instance,
            observaciones=f'Método: {instance.metodo_pago.nombre if instance.metodo_pago else "Efectivo"}'
        )
        
        print(f"✅ [SIGNAL CUOTA] Movimiento #{movimiento.id} creado exitosamente")
        
    except Exception as e:
        print(f"❌ [SIGNAL CUOTA] Error: {e}")
        import traceback
        traceback.print_exc()