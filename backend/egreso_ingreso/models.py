from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal

# Create your models here.
class Egreso(models.Model):
    descripcion = models.CharField(max_length=300)
    monto = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    metodo_pago = models.ForeignKey(
        "dominios_comunes.MetodoPago", 
        on_delete=models.RESTRICT
    )
    fecha_registro = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"Egreso: {self.descripcion} - ${self.monto}"

    def clean(self):
        if not self.descripcion or not self.descripcion.strip():
            raise ValidationError("La descripción del egreso es obligatoria")
        if self.monto <= 0:
            raise ValidationError("El monto debe ser mayor que cero")
        self.descripcion = self.descripcion.strip()

    class Meta:
        verbose_name = "Egreso"
        verbose_name_plural = "Egresos"
        ordering = ['-fecha_registro']


class Ingreso(models.Model):
    descripcion = models.CharField(max_length=300)
    monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    metodo_pago = models.ForeignKey(
        "dominios_comunes.MetodoPago",
        on_delete=models.RESTRICT
    )
    fecha_registro = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"Ingreso: {self.descripcion} - ${self.monto}"

    def clean(self):
        if not self.descripcion or not self.descripcion.strip():
            raise ValidationError("La descripción del ingreso es obligatoria")
        if self.monto <= 0:
            raise ValidationError("El monto debe ser mayor que cero")
        self.descripcion = self.descripcion.strip()

    class Meta:
        verbose_name = "Ingreso"
        verbose_name_plural = "Ingresos"
        ordering = ['-fecha_registro']
