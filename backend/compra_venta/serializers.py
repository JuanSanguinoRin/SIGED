from rest_framework import serializers
from .models import Compra, CompraPrenda, Venta, VentaPrenda
from django.db import transaction



# ============ SERIALIZERS DE RELACIONES INTERMEDIAS ============


class CompraPrendaSerializer(serializers.ModelSerializer):
    """Serializer para CompraPrenda (detalle de compra)"""
    prenda_nombre = serializers.CharField(source="prenda.nombre", read_only=True)
    prenda_gramos = serializers.DecimalField(
        source="prenda.gramos", 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )


    class Meta:
        model = CompraPrenda
        fields = [
            'id', 'prenda', 'prenda_nombre', 'prenda_gramos', 
            'cantidad', 'precio_por_gramo', 'subtotal_gramos', 'subtotal'
        ]
        read_only_fields = ['subtotal', 'subtotal_gramos']



class VentaPrendaSerializer(serializers.ModelSerializer):
    """Serializer para VentaPrenda (detalle de venta)"""
    prenda_nombre = serializers.CharField(source="prenda.nombre", read_only=True)
    prenda_gramos = serializers.DecimalField(
        source="prenda.gramos", 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )


    class Meta:
        model = VentaPrenda
        fields = [
            'id', 'prenda', 'prenda_nombre', 'prenda_gramos', 
            'cantidad', 'precio_por_gramo', 'gramo_ganancia', 'subtotal_gramos', 'subtotal'
        ]
        read_only_fields = ['subtotal', 'subtotal_gramos']



# ============ SERIALIZERS PRINCIPALES ============


class CompraSerializer(serializers.ModelSerializer):
    """Serializer para lectura de Compra"""
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)
    metodo_pago_nombre = serializers.CharField(source="metodo_pago.nombre", read_only=True)
    prendas = CompraPrendaSerializer(many=True, read_only=True)
    total_gramos = serializers.SerializerMethodField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)


    class Meta:
        model = Compra
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'credito', 
            'metodo_pago', 'metodo_pago_nombre', 'fecha', 'descripcion', 
            'total_gramos', 'total', 'prendas'
        ]
        read_only_fields = ['fecha', 'total', 'total_gramos']


    def get_total_gramos(self, obj):
        """Calcula el total de gramos de la compra"""
        return sum(cp.prenda.gramos * cp.cantidad for cp in obj.prendas.all())



class CompraCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para creación y actualización de Compra"""
    prendas = CompraPrendaSerializer(many=True, required=True)


    class Meta:
        model = Compra
        fields = [
            'id', 'proveedor', 'credito', 'metodo_pago', 
            'fecha', 'descripcion', 'total', 'prendas'
        ]
        read_only_fields = ['fecha', 'total']


    def validate_prendas(self, value):
        """Validar que haya al menos una prenda"""
        if not value:
            raise serializers.ValidationError("La compra debe contener al menos una prenda.")
        return value


    def create(self, validated_data):
        """Crear compra con sus prendas asociadas"""
        prendas_data = validated_data.pop('prendas', [])
        
        # Crear la compra primero (sin total calculado aún)
        compra = Compra.objects.create(**validated_data)
        
        # Crear todas las prendas (esto actualiza el stock)
        for prenda_data in prendas_data:
            CompraPrenda.objects.create(compra=compra, **prenda_data)
        
        # Ahora calcular el total después de que todas las prendas existen
        compra.total = compra.calcular_total()
        compra.save(update_fields=['total'])
        
        return compra


    def update(self, instance, validated_data):
        """Actualizar compra y sus prendas"""
        prendas_data = validated_data.pop('prendas', None)
        
        # Actualizar campos de la compra
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Si se proporcionan prendas, reemplazarlas completamente
        if prendas_data is not None:
            instance.prendas.all().delete()
            
            for prenda_data in prendas_data:
                CompraPrenda.objects.create(compra=instance, **prenda_data)
            
            # Recalcular total después de cambiar prendas
            instance.total = instance.calcular_total()
            instance.save(update_fields=['total'])
        
        return instance



class VentaSerializer(serializers.ModelSerializer):
    """Serializer para lectura de Venta"""
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    metodo_pago_nombre = serializers.CharField(source="metodo_pago.nombre", read_only=True)
    prendas = VentaPrendaSerializer(many=True, read_only=True)
    total_gramos = serializers.SerializerMethodField()
    ganancia_total = serializers.SerializerMethodField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)


    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'cliente_nombre', 'credito', 'apartado',
            'metodo_pago', 'metodo_pago_nombre', 'fecha', 'descripcion', 
            'total_gramos', 'ganancia_total', 'total', 'prendas'
        ]
        read_only_fields = ['fecha', 'total', 'total_gramos', 'ganancia_total']


    def get_total_gramos(self, obj):
        """Calcula el total de gramos sin ajuste de ganancia"""
        return obj.total_gramos()


    def get_ganancia_total(self, obj):
        """Calcula la ganancia total de la venta"""
        return obj.calcular_ganancia_total()



class VentaCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para creación y actualización de Venta"""
    prendas = VentaPrendaSerializer(many=True, required=True)


    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'credito', 'apartado',
            'metodo_pago', 'fecha', 'descripcion', 'total', 'prendas'
        ]
        read_only_fields = ['fecha', 'total']


    def validate(self, data):
        """Validar que no tenga crédito Y apartado simultáneamente"""
        if data.get('credito') and data.get('apartado'):
            raise serializers.ValidationError(
                "Una venta no puede tener tanto crédito como apartado al mismo tiempo."
            )
        return data


    def validate_prendas(self, value):
        """Validar que haya al menos una prenda"""
        if not value:
            raise serializers.ValidationError("La venta debe contener al menos una prenda.")
        return value


    def create(self, validated_data):
        prendas_data = validated_data.pop('prendas', [])

        with transaction.atomic():
            venta = Venta.objects.create(**validated_data)

            # Crear todas las prendas de una sola vez
            prendas_objs = [
                VentaPrenda(venta=venta, **p_data)
                for p_data in prendas_data
            ]
            VentaPrenda.objects.bulk_create(prendas_objs)

            # Actualizar existencias manualmente
            for p in prendas_objs:
                prenda = p.prenda
                prenda.existencia -= p.cantidad
                prenda.save(update_fields=['existencia'])

            # Calcular total solo una vez
            venta.total = venta.calcular_total()
            venta.save(update_fields=['total'])

        return venta


    def update(self, instance, validated_data):
        """Actualizar venta y sus prendas"""
        prendas_data = validated_data.pop('prendas', None)
        
        # Actualizar campos de la venta
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Si se proporcionan prendas, reemplazarlas completamente
        if prendas_data is not None:
            instance.prendas.all().delete()
            
            for prenda_data in prendas_data:
                VentaPrenda.objects.create(venta=instance, **prenda_data)
            
            # Recalcular total después de cambiar prendas
            instance.total = instance.calcular_total()
            instance.save(update_fields=['total'])
        
        return instance