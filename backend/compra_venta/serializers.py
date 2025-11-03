from rest_framework import serializers
from .models import Compra, CompraPrenda, Venta, VentaPrenda


# ---------- SERIALIZERS DE RELACIONES INTERMEDIAS ----------

class CompraPrendaSerializer(serializers.ModelSerializer):
    prenda_nombre = serializers.CharField(source="prenda.nombre", read_only=True)

    class Meta:
        model = CompraPrenda
        fields = ['id', 'prenda', 'prenda_nombre', 'cantidad', 'subtotal_gramos']


class VentaPrendaSerializer(serializers.ModelSerializer):
    prenda_nombre = serializers.CharField(source="prenda.nombre", read_only=True)

    class Meta:
        model = VentaPrenda
        fields = ['id', 'prenda', 'prenda_nombre', 'cantidad', 'subtotal_gramos']


# ---------- SERIALIZERS PRINCIPALES ----------

class CompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)
    prendas = CompraPrendaSerializer(many=True, required=False)

    class Meta:
        model = Compra
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'credito', 'precio_por_gramo',
            'metodo_pago', 'fecha', 'descripcion', 'total', 'prendas'
        ]

    def create(self, validated_data):
        prendas_data = validated_data.pop('prendas', [])
        compra = Compra.objects.create(**validated_data)
        for prenda_data in prendas_data:
            CompraPrenda.objects.create(compra=compra, **prenda_data)
        return compra

    def update(self, instance, validated_data):
        prendas_data = validated_data.pop('prendas', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Si se envía la lista de prendas, actualizamos
        if prendas_data is not None:
            instance.prendas.all().delete()
            for prenda_data in prendas_data:
                CompraPrenda.objects.create(compra=instance, **prenda_data)
        return instance


class VentaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)
    prendas = VentaPrendaSerializer(many=True, required=False)

    class Meta:
        model = Venta
        fields = [
            'id', 'cliente', 'cliente_nombre', 'credito', 'apartado',
            'precio_por_gramo', 'gramo_ganancia', 'metodo_pago',
            'fecha', 'descripcion', 'total', 'prendas'
        ]

    def create(self, validated_data):
        prendas_data = validated_data.pop('prendas', [])
        venta = Venta.objects.create(**validated_data)
        for prenda_data in prendas_data:
            VentaPrenda.objects.create(venta=venta, **prenda_data)
        return venta

    def update(self, instance, validated_data):
        prendas_data = validated_data.pop('prendas', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if prendas_data is not None:
            instance.prendas.all().delete()
            for prenda_data in prendas_data:
                VentaPrenda.objects.create(venta=instance, **prenda_data)
        return instance
