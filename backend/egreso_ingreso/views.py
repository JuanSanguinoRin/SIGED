# egreso_ingreso/views.py
from rest_framework import viewsets
from .models import Egreso, Ingreso
from .serializers import EgresoSerializer, IngresoSerializer

class EgresoViewSet(viewsets.ModelViewSet):
    queryset = Egreso.objects.all()
    serializer_class = EgresoSerializer


class IngresoViewSet(viewsets.ModelViewSet):
    queryset = Ingreso.objects.all()
    serializer_class = IngresoSerializer
