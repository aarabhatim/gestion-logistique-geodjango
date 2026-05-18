from django.contrib.gis import admin
from .models import Incident, IncidentPhoto


class IncidentPhotoInline(admin.TabularInline):
    model = IncidentPhoto
    extra = 0
    readonly_fields = ['uploaded_at']


@admin.register(Incident)
class IncidentAdmin(admin.GISModelAdmin):
    list_display = ['id', 'commande', 'type_incident', 'statut', 'date_signalement', 'date_resolution']
    list_filter = ['type_incident', 'statut', 'date_signalement']
    search_fields = ['commande__reference', 'description']
    readonly_fields = ['date_signalement', 'date_resolution']
    inlines = [IncidentPhotoInline]


@admin.register(IncidentPhoto)
class IncidentPhotoAdmin(admin.ModelAdmin):
    list_display = ['id', 'incident', 'legende', 'uploaded_at']
    readonly_fields = ['uploaded_at']
