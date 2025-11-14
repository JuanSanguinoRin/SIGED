from rest_framework import serializers
from decimal import Decimal
from .models import Apartado, Credito, Cuota


class ApartadoSerializer(serializers.ModelSerializer):
    estado_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Apartado
        fields = '__all__'

    def get_estado_nombre(self, obj):
        """
        Devuelve el nombre (usando __str__) del estado o None si no hay relación.
        """
        return str(obj.estado) if obj.estado else None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['estado_nombre'] = self.get_estado_nombre(instance)
        return rep

    def update(self, instance, validated_data):
        """
        Permite actualizaciones parciales sin requerir todos los campos.
        """
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.full_clean()
        instance.save()
        return instance

    def validate(self, data):
        """Validaciones amigables para Apartado antes de guardar."""
        # obtener los valores finales considerando instancia (en update)
        cantidad = data.get('cantidad_cuotas', getattr(self.instance, 'cantidad_cuotas', None))
        cuotas_pend = data.get('cuotas_pendientes', getattr(self.instance, 'cuotas_pendientes', None))
        monto_total = data.get('monto_total', getattr(self.instance, 'monto_total', None))
        monto_pend = data.get('monto_pendiente', getattr(self.instance, 'monto_pendiente', None))

        errors = {}
        if cantidad is not None and cuotas_pend is not None:
            if cuotas_pend > cantidad:
                errors['cuotas_pendientes'] = 'Las cuotas pendientes no pueden ser mayores que la cantidad total de cuotas.'

        if monto_total is not None and monto_pend is not None:
            if monto_pend > monto_total:
                errors['monto_pendiente'] = 'El monto pendiente no puede ser mayor que el monto total.'

        if errors:
            raise serializers.ValidationError(errors)

        return data


class CreditoSerializer(serializers.ModelSerializer):
    estado_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Credito
        fields = '__all__'
        extra_fields = ['estado_detalle']

    def get_estado_detalle(self, obj):
        return str(obj.estado) if obj.estado else None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['estado_detalle'] = self.get_estado_detalle(instance)
        return rep

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.full_clean()
        instance.save()
        return instance

    def validate(self, data):
        """Validaciones amigables para Credito antes de guardar."""
        cantidad = data.get('cantidad_cuotas', getattr(self.instance, 'cantidad_cuotas', None))
        cuotas_pend = data.get('cuotas_pendientes', getattr(self.instance, 'cuotas_pendientes', None))
        monto_total = data.get('monto_total', getattr(self.instance, 'monto_total', None))
        monto_pend = data.get('monto_pendiente', getattr(self.instance, 'monto_pendiente', None))

        errors = {}
        if cantidad is not None and cuotas_pend is not None:
            if cuotas_pend > cantidad:
                errors['cuotas_pendientes'] = 'Las cuotas pendientes no pueden ser mayores que la cantidad total de cuotas.'

        if monto_total is not None and monto_pend is not None:
            if monto_pend > monto_total:
                errors['monto_pendiente'] = 'El monto pendiente no puede ser mayor que el monto total.'

        if errors:
            raise serializers.ValidationError(errors)

        return data


class CuotaSerializer(serializers.ModelSerializer):
    # Campos descriptivos (solo lectura, se muestran en el JSON de salida)
    metodo_pago_nombre = serializers.CharField(source='metodo_pago.__str__', read_only=True)
    credito_detalle = serializers.CharField(source='credito.__str__', read_only=True)
    apartado_detalle = serializers.CharField(source='apartado.__str__', read_only=True)

    class Meta:
        model = Cuota
        # Mostramos los campos con nombres legibles
        fields = [
            'id',
            'fecha',
            'monto',
            'metodo_pago',
            'metodo_pago_nombre',  # nombre legible del método de pago
            'credito',
            'credito_detalle',     # texto legible del crédito
            'apartado',
            'apartado_detalle'     # texto legible del apartado
        ]

    def update(self, instance, validated_data):
        """Permitir actualizaciones parciales (PATCH) sin requerir todos los campos."""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.full_clean()  # Valida según reglas del modelo (clean)
        instance.save()
        return instance

    def validate(self, data):
        """Validaciones para la creación/actualización de una cuota.

        - Evita cuotas con monto negativo o cero.
        - Evita cuotas cuyo monto exceda el monto pendiente del crédito/apartado.
        - Evita registrar una cuota con fecha mayor a la fecha límite del crédito/apartado.
        - Evita registrar una cuota si no hay cuotas pendientes.
        """
        credito = data.get('credito') or getattr(self.instance, 'credito', None)
        apartado = data.get('apartado') or getattr(self.instance, 'apartado', None)
        monto = data.get('monto') or getattr(self.instance, 'monto', None)
        fecha = data.get('fecha') or getattr(self.instance, 'fecha', None)

        errors = {}

        # XOR: la cuota debe pertenecer sólo a crédito o a apartado, no a ambos ni a ninguno
        if credito and apartado:
            errors['non_field_errors'] = 'La cuota no puede pertenecer tanto a un crédito como a un apartado.'
            raise serializers.ValidationError(errors)

        if not credito and not apartado:
            errors['non_field_errors'] = 'La cuota debe pertenecer a un crédito o a un apartado.'
            raise serializers.ValidationError(errors)

        if monto is not None:
            try:
                monto_val = float(monto)
            except Exception:
                errors['monto'] = 'Monto inválido.'
                raise serializers.ValidationError(errors)
            if monto_val <= 0:
                errors['monto'] = 'El monto de la cuota debe ser mayor que cero.'

        # Validaciones por tipo
        if credito:
            # fecha vs fecha_limite
            if fecha and credito.fecha_limite and fecha > credito.fecha_limite:
                errors['fecha'] = 'La fecha de la cuota no puede ser posterior a la fecha límite del crédito.'

            # cuotas pendientes
            if credito.cuotas_pendientes is not None and credito.cuotas_pendientes <= 0:
                errors['credito'] = 'No hay cuotas pendientes en este crédito.'

            # monto pendiente
            monto_pend = credito.monto_pendiente if credito.monto_pendiente is not None else credito.monto_total
            if monto is not None and monto_pend is not None:
                if Decimal(str(monto)) > Decimal(str(monto_pend)):
                    errors['monto'] = 'El monto de la cuota no puede exceder el monto pendiente del crédito.'

        if apartado:
            if fecha and apartado.fecha_limite and fecha > apartado.fecha_limite:
                errors['fecha'] = 'La fecha de la cuota no puede ser posterior a la fecha límite del apartado.'

            if apartado.cuotas_pendientes is not None and apartado.cuotas_pendientes <= 0:
                errors['apartado'] = 'No hay cuotas pendientes en este apartado.'

            monto_pend = apartado.monto_pendiente if apartado.monto_pendiente is not None else apartado.monto_total
            if monto is not None and monto_pend is not None:
                if Decimal(str(monto)) > Decimal(str(monto_pend)):
                    errors['monto'] = 'El monto de la cuota no puede exceder el monto pendiente del apartado.'

        if errors:
            raise serializers.ValidationError(errors)

        return data
