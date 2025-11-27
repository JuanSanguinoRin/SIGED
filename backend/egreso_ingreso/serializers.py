# egreso_ingreso/serializers.py
from rest_framework import serializers
from .models import Egreso, Ingreso

class EgresoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Egreso
        fields = ['id', 'descripcion', 'monto', 'metodo_pago', 'fecha_registro']

class IngresoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingreso
        fields = ['id', 'descripcion', 'monto', 'metodo_pago', 'fecha_registro']
