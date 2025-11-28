from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, F, Q, DecimalField, Count
from django.db.models.functions import TruncDate, Coalesce
from decimal import Decimal
from datetime import datetime, timedelta
from .models import Compra, Venta, VentaPrenda
from prendas.models import Prenda
from apartado_credito.models import Apartado


class DashboardResumenView(APIView):
    """
    Endpoint optimizado para obtener estadísticas del dashboard
    GET /api/compra_venta/dashboard/resumen/
    
    Retorna:
    - stock_total: Total de gramos disponibles en inventario
    - apartado_total: Total de gramos en apartados activos
    - promedio_oro_nacional: Precio promedio por gramo de oro nacional
    - promedio_oro_italiano: Precio promedio por gramo de oro italiano
    - ventas_vs_compras: Array con ventas y compras de los últimos 7 días
    """
    
    def get(self, request):
        try:
            # 1. Calcular Stock Total (gramos * existencia, solo no archivados)
            stock_data = Prenda.objects.filter(archivado=False).aggregate(
                total_gramos=Coalesce(
                    Sum(F('gramos') * F('existencia'), output_field=DecimalField()),
                    Decimal('0.00')
                )
            )
            stock_total = float(stock_data['total_gramos'])
            
            # 2. Calcular Apartado Total (gramos en ventas con apartado activo)
            apartado_total = 0.0
            apartados_activos = Apartado.objects.filter(
                estado=4  # Estado "En Proceso"
            ).values_list('id', flat=True)
            
            if apartados_activos:
                ventas_apartadas = VentaPrenda.objects.filter(
                    venta__apartado_id__in=apartados_activos
                ).select_related('prenda')
                
                for vp in ventas_apartadas:
                    apartado_total += float(vp.prenda.gramos * vp.cantidad)
            
            # 3. Calcular Promedios de Oro (precio por gramo en ventas)
            # Nacional
            nacional_avg = VentaPrenda.objects.filter(
                prenda__tipo_oro__nombre='NACIONAL',
                precio_por_gramo__gt=0
            ).aggregate(
                promedio=Coalesce(
                    Sum('precio_por_gramo') / Count('id'),
                    Decimal('0.00'),
                    output_field=DecimalField()
                )
            )
            promedio_oro_nacional = float(nacional_avg['promedio'] or 0)
            
            # Italiano
            italiano_avg = VentaPrenda.objects.filter(
                prenda__tipo_oro__nombre='ITALIANO',
                precio_por_gramo__gt=0
            ).aggregate(
                promedio=Coalesce(
                    Sum('precio_por_gramo') / Count('id'),
                    Decimal('0.00'),
                    output_field=DecimalField()
                )
            )
            promedio_oro_italiano = float(italiano_avg['promedio'] or 0)
            
            # 4. Ventas vs Compras (últimos 7 días)
            fecha_inicio = datetime.now().date() - timedelta(days=6)
            
            # Agrupar ventas por fecha
            ventas_por_fecha = Venta.objects.filter(
                fecha__gte=fecha_inicio
            ).values('fecha').annotate(
                total_ventas=Coalesce(Sum('total'), Decimal('0.00'))
            ).order_by('fecha')
            
            # Agrupar compras por fecha
            compras_por_fecha = Compra.objects.filter(
                fecha__gte=fecha_inicio
            ).values('fecha').annotate(
                total_compras=Coalesce(Sum('total'), Decimal('0.00'))
            ).order_by('fecha')
            
            # Crear diccionarios para fácil acceso
            ventas_dict = {v['fecha']: float(v['total_ventas']) for v in ventas_por_fecha}
            compras_dict = {c['fecha']: float(c['total_compras']) for c in compras_por_fecha}
            
            # Crear array con todos los días (últimos 7)
            ventas_vs_compras = []
            for i in range(7):
                fecha = fecha_inicio + timedelta(days=i)
                ventas_vs_compras.append({
                    'fecha': fecha.strftime('%d %b'),
                    'ventas': ventas_dict.get(fecha, 0.0),
                    'compras': compras_dict.get(fecha, 0.0)
                })
            
            # Respuesta
            return Response({
                'stock_total': stock_total,
                'apartado_total': apartado_total,
                'promedio_oro_nacional': promedio_oro_nacional,
                'promedio_oro_italiano': promedio_oro_italiano,
                'ventas_vs_compras': ventas_vs_compras
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Error al calcular estadísticas del dashboard: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
