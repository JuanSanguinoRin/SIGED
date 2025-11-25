# caja/apps.py
from django.apps import AppConfig


class CajaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'caja'
    
    def ready(self):
        """Importar signals cuando la app esté lista"""
        import caja.signals  # ✅ Esto activa los signals
        print("✅ [CAJA] Signals cargados correctamente")  # Para debug