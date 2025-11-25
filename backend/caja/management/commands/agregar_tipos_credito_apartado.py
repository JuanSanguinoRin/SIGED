# caja/management/commands/agregar_tipos_credito_apartado.py
from django.core.management.base import BaseCommand
from caja.models import TipoMovimiento


class Command(BaseCommand):
    help = 'Agrega tipos de movimiento para ventas/compras a crédito y apartado'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('🚀 Agregando tipos de movimiento...\n'))
        
        tipos = [
            # VENTAS A CRÉDITO (informativo, no afecta caja aún)
            {
                'nombre': 'Venta a Crédito',
                'tipo': 'E',  # Entrada (eventualmente)
                'descripcion': 'Venta registrada con pago diferido a cuotas (no afecta caja inmediatamente)'
            },
            # VENTAS A APARTADO (informativo)
            {
                'nombre': 'Venta Apartado',
                'tipo': 'E',
                'descripcion': 'Venta con apartado - Cliente pagará en cuotas (no afecta caja inmediatamente)'
            },
            # COMPRAS A CRÉDITO (informativo)
            {
                'nombre': 'Compra a Crédito',
                'tipo': 'S',  # Salida (eventualmente)
                'descripcion': 'Compra registrada con pago diferido a proveedor (no afecta caja inmediatamente)'
            },
        ]
        
        creados = 0
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
                self.stdout.write(f'  ✅ Tipo creado: {tipo.nombre}')
                creados += 1
            else:
                self.stdout.write(f'  ⚠️  Tipo ya existe: {tipo.nombre}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✨ {creados} tipos de movimiento creados\n'))