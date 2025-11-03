from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal


class Compra(models.Model):
    proveedor = models.ForeignKey(
        "terceros.Proveedor", 
        on_delete=models.RESTRICT,
        related_name="compras"
    )
    credito = models.ForeignKey(
        "apartado_credito.Credito", 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True,
        related_name="compras"
    )
    metodo_pago = models.ForeignKey(
        "dominios_comunes.MetodoPago", 
        on_delete=models.RESTRICT
    )
    fecha = models.DateField(auto_now_add=True)
    descripcion = models.TextField(blank=True, null=True)
    total = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        editable=False,
        default=Decimal('0.00')
    )

    def __str__(self):
        return f"Compra - {self.proveedor.nombre} - ${self.total}"

    def calcular_total(self):
        """
        Calcula el total sumando los subtotales de todas las prendas.
        
        total = suma(subtotal de cada prenda)
        
        Donde cada subtotal es:
        subtotal_prenda = (gramos_prenda * precio_por_gramo) * cantidad
        """
        total = Decimal('0.00')
        for prenda_item in self.prendas.all():
            total += prenda_item.subtotal
        return total

    def save(self, *args, **kwargs):
        """Recalcular total antes de guardar"""
        self.total = self.calcular_total()
        super().save(*args, **kwargs)

    def clean(self):
        """Validaciones a nivel de modelo"""
        if self.prendas.count() == 0:
            raise ValidationError("La compra debe contener al menos una prenda")

    class Meta:
        verbose_name = "Compra"
        verbose_name_plural = "Compras"
        ordering = ['-fecha']


class Venta(models.Model):
    cliente = models.ForeignKey(
        "terceros.Cliente", 
        on_delete=models.RESTRICT,
        related_name="ventas"
    )
    credito = models.ForeignKey(
        "apartado_credito.Credito", 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True,
        related_name="ventas"
    )
    apartado = models.ForeignKey(
        "apartado_credito.Apartado", 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True,
        related_name="ventas"
    )
    metodo_pago = models.ForeignKey(
        "dominios_comunes.MetodoPago", 
        on_delete=models.RESTRICT
    )
    fecha = models.DateField(auto_now_add=True)
    descripcion = models.TextField(blank=True, null=True)
    total = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        editable=False,
        default=Decimal('0.00')
    )

    def __str__(self):
        return f"Venta - {self.cliente.nombre} - ${self.total}"

    def calcular_total(self):
        """
        Calcula el total sumando los subtotales de todas las prendas.
        
        total = suma(subtotal de cada prenda)
        
        Donde cada subtotal es:
        subtotal_prenda = ((gramos_prenda + gramo_ganancia) * precio_por_gramo) * cantidad
        """
        total = Decimal('0.00')
        for prenda_item in self.prendas.all():
            total += prenda_item.subtotal
        return total

    def calcular_ganancia_total(self):
        """
        Calcula la ganancia total sumando la ganancia de cada prenda.
        
        Para cada prenda:
        gramos_ajustados = gramos_prenda + gramo_ganancia
        gramos_totales = gramos_ajustados * cantidad
        
        Luego sumamos todas las ganancias:
        ganancia_prenda = (gramo_ganancia * cantidad) * precio_por_gramo
        ganancia_total = suma(ganancia de cada prenda)
        """
        ganancia = Decimal('0.00')
        for prenda_item in self.prendas.all():
            # Ganancia = (gramo_ganancia * cantidad) * precio_por_gramo
            ganancia_prenda = (prenda_item.gramo_ganancia * prenda_item.cantidad) * prenda_item.precio_por_gramo
            ganancia += ganancia_prenda
        return ganancia

    def total_gramos(self):
        """
        Calcula el total de gramos sin ajuste de ganancia.
        total_gramos = suma(gramos_prenda * cantidad)
        """
        total = Decimal('0.00')
        for prenda_item in self.prendas.all():
            gramos = prenda_item.prenda.gramos * prenda_item.cantidad
            total += Decimal(str(gramos))
        return total

    def save(self, *args, **kwargs):
        """Recalcular total antes de guardar"""
        self.total = self.calcular_total()
        super().save(*args, **kwargs)

    def clean(self):
        """Validaciones a nivel de modelo"""
        # Validación XOR crítica: una venta NO puede tener crédito Y apartado
        if self.credito and self.apartado:
            raise ValidationError(
                "Una venta no puede tener tanto crédito como apartado al mismo tiempo"
            )
        
        if self.prendas.count() == 0:
            raise ValidationError("La venta debe contener al menos una prenda")

    class Meta:
        verbose_name = "Venta"
        verbose_name_plural = "Ventas"
        ordering = ['-fecha']
        constraints = [
            # Constraint XOR: no puede tener tanto crédito como apartado
            models.CheckConstraint(
                check=~(models.Q(credito__isnull=False) & models.Q(apartado__isnull=False)),
                name='venta_no_credito_y_apartado'
            ),
        ]

class VentaPrenda(models.Model):
    venta = models.ForeignKey("Venta", on_delete=models.CASCADE, related_name="prendas")
    prenda = models.ForeignKey("prendas.Prenda", on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_por_gramo = models.DecimalField(
        max_digits=10, decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        default=Decimal('0.00')
    )
    gramo_ganancia = models.DecimalField(
        max_digits=8, decimal_places=2, 
        validators=[MinValueValidator(Decimal('0'))],
        default=Decimal('0.1')
    )
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        editable=False, default=Decimal('0.00')
    )

    def calcular_subtotal(self):
        """
        Fórmula correcta:
        subtotal = ((gramos_prenda + gramo_ganancia) * precio_por_gramo) * cantidad
        """
        peso_ajustado = self.prenda.gramos + self.gramo_ganancia
        subtotal = (Decimal(str(peso_ajustado)) * self.precio_por_gramo) * self.cantidad
        return subtotal

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        # Recalcular subtotal con la fórmula correcta
        self.subtotal = self.calcular_subtotal()
        
        if is_new:
            if not self.prenda.tiene_stock(self.cantidad):
                raise ValidationError(f"No hay suficiente stock para {self.prenda}")
            super().save(*args, **kwargs)
            self.prenda.existencia -= self.cantidad
        else:
            old_instance = VentaPrenda.objects.get(pk=self.pk)
            diferencia = self.cantidad - old_instance.cantidad
            if diferencia > 0 and not self.prenda.tiene_stock(diferencia):
                raise ValidationError("No hay suficiente stock para aumentar la cantidad")
            super().save(*args, **kwargs)
            self.prenda.existencia -= diferencia
        
        self.prenda.save(update_fields=['existencia'])
        self.venta.save()

    def delete(self, *args, **kwargs):
        self.prenda.existencia += self.cantidad
        self.prenda.save(update_fields=['existencia'])
        super().delete(*args, **kwargs)
        self.venta.save()

    def subtotal_gramos(self):
        """Total de gramos sin ajuste de ganancia"""
        return self.prenda.gramos * self.cantidad

    class Meta:
        verbose_name = "Venta Prenda"
        verbose_name_plural = "Ventas Prendas"
        unique_together = ['venta', 'prenda']


class CompraPrenda(models.Model):
    compra = models.ForeignKey("Compra", on_delete=models.CASCADE, related_name="prendas")
    prenda = models.ForeignKey("prendas.Prenda", on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_por_gramo = models.DecimalField(
        max_digits=10, decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        default=Decimal('0.00')
    )
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        editable=False, default=Decimal('0.00')
    )

    def calcular_subtotal(self):
        """
        Fórmula para compra:
        subtotal = (gramos_prenda * precio_por_gramo) * cantidad
        """
        gramos_totales = self.prenda.gramos * self.cantidad
        subtotal = Decimal(str(gramos_totales)) * self.precio_por_gramo
        return subtotal

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        # Recalcular subtotal
        self.subtotal = self.calcular_subtotal()
        
        super().save(*args, **kwargs)
        
        if is_new:
            self.prenda.existencia += self.cantidad
        else:
            old_instance = CompraPrenda.objects.get(pk=self.pk)
            diferencia = self.cantidad - old_instance.cantidad
            self.prenda.existencia += diferencia
        
        self.prenda.save(update_fields=['existencia'])
        self.compra.save()

    def delete(self, *args, **kwargs):
        self.prenda.existencia -= self.cantidad
        self.prenda.save(update_fields=['existencia'])
        super().delete(*args, **kwargs)
        self.compra.save()

    def subtotal_gramos(self):
        """Total de gramos"""
        return self.prenda.gramos * self.cantidad

    class Meta:
        verbose_name = "Compra Prenda"
        verbose_name_plural = "Compras Prendas"
        unique_together = ['compra', 'prenda']