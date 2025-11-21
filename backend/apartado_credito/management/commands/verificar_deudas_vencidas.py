from django.core.management.base import BaseCommand
from django.utils import timezone
from apartado_credito.models import Credito, Apartado, ESTADO_EN_PROCESO

class Command(BaseCommand):
    help = 'Verifica y actualiza el estado de deudas vencidas'

    def handle(self, *args, **kwargs):
        fecha_actual = timezone.now().date()
        
        # Verificar créditos
        creditos_vencidos = Credito.objects.filter(
            fecha_limite__lt=fecha_actual,
            estado_id=ESTADO_EN_PROCESO,
            monto_pendiente__gt=0
        )
        
        creditos_actualizados = 0
        for credito in creditos_vencidos:
            if credito.verificar_y_actualizar_estado():
                creditos_actualizados += 1
        
        # Verificar apartados
        apartados_vencidos = Apartado.objects.filter(
            fecha_limite__lt=fecha_actual,
            estado_id=ESTADO_EN_PROCESO,
            monto_pendiente__gt=0
        )
        
        apartados_actualizados = 0
        for apartado in apartados_vencidos:
            if apartado.verificar_y_actualizar_estado():
                apartados_actualizados += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Créditos caducados: {creditos_actualizados}\n'
                f'✅ Apartados caducados: {apartados_actualizados}'
            )
        )