from django.core.management.base import BaseCommand
from caja.models import TipoMovimiento

class Command(BaseCommand):
    help = 'Agrega tipos de movimiento para egresos e ingresos operativos'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('🚀 Agregando tipos de movimiento operativos...\n'))
        
        tipos = [
            {
                'nombre': 'Egreso Operativo',
                'tipo': 'S',  # Salida
                'descripcion': 'Gastos operativos del negocio (luz, agua, almuerzos, etc.)'
            },
            {
                'nombre': 'Ingreso Operativo',
                'tipo': 'E',  # Entrada
                'descripcion': 'Ingresos operativos adicionales no relacionados con ventas'
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