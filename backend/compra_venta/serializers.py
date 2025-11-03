from rest_framework import serializers
from .models import Compra, CompraPrenda, Venta, VentaPrenda


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
        compra = Compra.objects.create(**validated_data)
        
        for prenda_data in prendas_data:
            CompraPrenda.objects.create(compra=compra, **prenda_data)
        
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
        """Crear venta con sus prendas asociadas"""
        prendas_data = validated_data.pop('prendas', [])
        venta = Venta.objects.create(**validated_data)
        
        for prenda_data in prendas_data:
            VentaPrenda.objects.create(venta=venta, **prenda_data)
        
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
        
        return instance