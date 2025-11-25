# caja/management/commands/setup_caja.py
from django.core.management.base import BaseCommand
from caja.models import CuentaBancaria, TipoMovimiento
from decimal import Decimal


class Command(BaseCommand):
    help = 'Crea datos iniciales para la app de caja basados en la estructura actual del sistema'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('🚀 Creando datos iniciales de Caja...\n'))
        
        # ===================================
        # 1. CREAR CUENTAS BANCARIAS
        # ===================================
        self.stdout.write(self.style.WARNING('📊 Creando Cuentas Bancarias...'))
        
        cuentas = [
            {
                'nombre': 'Efectivo',
                'descripcion': 'Dinero en efectivo - Caja física del negocio'
            },
            {
                'nombre': 'Transferencia A Cuenta Ahorros',
                'descripcion': 'Cuenta de ahorros para transferencias'
            },
            {
                'nombre': 'Daviplata',
                'descripcion': 'Billetera digital Daviplata'
            },
            {
                'nombre': 'Nequi',
                'descripcion': 'Billetera digital Nequi'
            },
            {
                'nombre': 'Addi',
                'descripcion': 'Financiación con Addi'
            },
            {
                'nombre': 'Sistecredito',
                'descripcion': 'Financiación con Sistecredito'
            },
        ]
        
        cuentas_creadas = 0
        for cuenta_data in cuentas:
            cuenta, created = CuentaBancaria.objects.get_or_create(
                nombre=cuenta_data['nombre'],
                defaults={
                    'descripcion': cuenta_data['descripcion'],
                    'saldo_actual': Decimal('0.00')
                }
            )
            if created:
                self.stdout.write(f'  ✅ Cuenta creada: {cuenta.nombre}')
                cuentas_creadas += 1
            else:
                self.stdout.write(f'  ⚠️  Cuenta ya existe: {cuenta.nombre}')
        
        self.stdout.write(f'  📌 Total cuentas creadas: {cuentas_creadas}/{len(cuentas)}\n')
        
        # ===================================
        # 2. CREAR TIPOS DE MOVIMIENTO
        # ===================================
        self.stdout.write(self.style.WARNING('💰 Creando Tipos de Movimiento...'))
        
        tipos = [
            # ENTRADAS (Dinero que ENTRA al negocio)
            {
                'nombre': 'Venta Contado',
                'tipo': 'E',
                'descripcion': 'Ingreso por venta pagada de contado completo'
            },
            {
                'nombre': 'Abono Cliente Crédito',
                'tipo': 'E',
                'descripcion': 'Ingreso por abono/cuota de cliente con crédito'
            },
            {
                'nombre': 'Abono Cliente Apartado',
                'tipo': 'E',
                'descripcion': 'Ingreso por abono/cuota de cliente con apartado'
            },
            {
                'nombre': 'Ingreso Extra',
                'tipo': 'E',
                'descripcion': 'Cualquier ingreso extraordinario no relacionado con ventas'
            },
            {
                'nombre': 'Ajuste Entrada',
                'tipo': 'E',
                'descripcion': 'Ajuste contable positivo (corrección de errores, sobrantes)'
            },
            
            # SALIDAS (Dinero que SALE del negocio)
            {
                'nombre': 'Compra Contado',
                'tipo': 'S',
                'descripcion': 'Egreso por compra pagada de contado completo a proveedor'
            },
            {
                'nombre': 'Abono Proveedor Crédito',
                'tipo': 'S',
                'descripcion': 'Egreso por abono/cuota a proveedor con crédito'
            },
            {
                'nombre': 'Egreso Operativo',
                'tipo': 'S',
                'descripcion': 'Gastos operativos: arriendo, servicios, almuerzos, útiles de aseo, etc.'
            },
            {
                'nombre': 'Retiro Personal',
                'tipo': 'S',
                'descripcion': 'Retiro de dinero para uso personal del dueño'
            },
            {
                'nombre': 'Ajuste Salida',
                'tipo': 'S',
                'descripcion': 'Ajuste contable negativo (corrección de errores, faltantes)'
            },
        ]
        
        tipos_creados = 0
        for tipo_data in tipos:
            tipo, created = TipoMovimiento.objects.get_or_create(
                nombre=tipo_data['nombre'],
                defaults={
                    'tipo': tipo_data['tipo'],
                    'descripcion': tipo_data['descripcion'],
                    'activo': True
                }
            )
            if created:
                tipo_display = 'ENTRADA ➕' if tipo.tipo == 'E' else 'SALIDA ➖'
                self.stdout.write(f'  ✅ Tipo creado: {tipo.nombre} ({tipo_display})')
                tipos_creados += 1
            else:
                self.stdout.write(f'  ⚠️  Tipo ya existe: {tipo.nombre}')
        
        self.stdout.write(f'  📌 Total tipos creados: {tipos_creados}/{len(tipos)}\n')
        
        # ===================================
        # 3. RESUMEN FINAL
        # ===================================
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('✨ ¡Configuración inicial completada!'))
        self.stdout.write(self.style.SUCCESS('='*60))
        
        total_cuentas = CuentaBancaria.objects.count()
        total_tipos = TipoMovimiento.objects.count()
        tipos_entrada = TipoMovimiento.objects.filter(tipo='E').count()
        tipos_salida = TipoMovimiento.objects.filter(tipo='S').count()
        
        self.stdout.write(f'\n📊 Resumen:')
        self.stdout.write(f'  • Cuentas Bancarias: {total_cuentas}')
        self.stdout.write(f'  • Tipos de Movimiento: {total_tipos}')
        self.stdout.write(f'    - Entradas: {tipos_entrada}')
        self.stdout.write(f'    - Salidas: {tipos_salida}')
        
        self.stdout.write(self.style.SUCCESS('\n🚀 El sistema de caja está listo para usarse\n'))
        
        # ===================================
        # 4. INSTRUCCIONES SIGUIENTES
        # ===================================
        self.stdout.write(self.style.WARNING('📝 Próximos pasos recomendados:'))
        self.stdout.write('  1. Verificar las cuentas creadas: GET /api/caja/cuentas/')
        self.stdout.write('  2. Verificar tipos de movimiento: GET /api/caja/tipos-movimiento/')
        self.stdout.write('  3. Crear una venta de contado para probar el signal automático')
        self.stdout.write('  4. Ver el movimiento generado: GET /api/caja/movimientos/')
        self.stdout.write('  5. Verificar saldos actualizados: GET /api/caja/cuentas/resumen_general/\n')