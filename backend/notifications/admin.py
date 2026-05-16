from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['titre', 'destinataire', 'type_notif', 'lue', 'date_creation']
    list_filter = ['type_notif', 'lue']
    search_fields = ['titre', 'destinataire__username']
