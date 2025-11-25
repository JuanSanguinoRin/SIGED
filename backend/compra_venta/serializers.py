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



# compra_venta/serializers.py
class CompraCreateUpdateSerializer(serializers.ModelSerializer):
    prendas = CompraPrendaSerializer(many=True, required=True)

    class Meta:
        model = Compra
        fields = [
            'id', 'proveedor', 'credito', 'metodo_pago',
            'fecha', 'descripcion', 'total', 'prendas'
        ]
        read_only_fields = ['fecha', 'total']

    def validate_prendas(self, value):
        if not value:
            raise serializers.ValidationError("La compra debe contener al menos una prenda.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        prendas_data = validated_data.pop('prendas', [])

        # ✅ Crear compra (signal aún no se dispara porque total = 0)
        compra = Compra.objects.create(**validated_data)

        # Crear prendas (actualizan stock)
        for p_data in prendas_data:
            CompraPrenda.objects.create(compra=compra, **p_data)

        # Calcular total
        compra.total = compra.calcular_total()
        compra.save(update_fields=['total'])

        # Si tiene crédito, inicializar montos
        if compra.credito:
            compra.credito.monto_total = compra.total
            compra.credito.monto_pendiente = compra.total
            if compra.credito.cuotas_pendientes is None:
                compra.credito.cuotas_pendientes = compra.credito.cantidad_cuotas
            compra.credito.save()

        # ✅ DISPARAR SIGNAL MANUALMENTE AHORA QUE EL TOTAL ESTÁ LISTO
        from caja.signals import registrar_compra_en_caja
        registrar_compra_en_caja(Compra, compra, created=True)

        return compra
    
    @transaction.atomic
    def update(self, instance, validated_data):
        prendas_data = validated_data.pop('prendas', None)

        # Actualizar campos simples
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Actualizar prendas si vienen nuevas
        if prendas_data is not None:
            instance.prendas.all().delete()
            for p_data in prendas_data:
                CompraPrenda.objects.create(compra=instance, **p_data)

        # Recalcular total
        instance.total = instance.calcular_total()
        instance.save(update_fields=['total'])

        # Si es compra a crédito, actualizar el crédito
        if instance.credito:
            instance.credito.monto_total = instance.total
            instance.credito.monto_pendiente = instance.total
            instance.credito.save()

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
    prendas = VentaPrendaSerializer(many=True, required=True)

    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'credito', 'apartado',
            'metodo_pago', 'fecha', 'descripcion', 'total', 'prendas'
        ]
        read_only_fields = ['fecha', 'total']

    def validate(self, data):
        if data.get('credito') and data.get('apartado'):
            raise serializers.ValidationError(
                "Una venta no puede tener tanto crédito como apartado al mismo tiempo."
            )
        return data

    def validate_prendas(self, value):
        if not value:
            raise serializers.ValidationError("La venta debe contener al menos una prenda.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        prendas_data = validated_data.pop('prendas', [])

        # ✅ Crear venta SIN disparar el signal aún
        venta = Venta.objects.create(**validated_data)

        # Crear prendas (YA actualizan stock dentro de save)
        for p_data in prendas_data:
            VentaPrenda.objects.create(venta=venta, **p_data)

        # Calcular total una sola vez
        venta.total = venta.calcular_total()
        venta.save(update_fields=['total'])  # ✅ AQUÍ se dispara el signal CON el total correcto

        # ✅ DISPARAR SIGNAL MANUALMENTE AHORA QUE EL TOTAL ESTÁ LISTO
        from caja.signals import registrar_venta_en_caja
        registrar_venta_en_caja(Venta, venta, created=True)

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