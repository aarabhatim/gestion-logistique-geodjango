from django.contrib import admin
from .models import Banniere

@admin.register(Banniere)
class BanniereAdmin(admin.ModelAdmin):
    list_display = ['titre', 'type', 'role_cible', 'actif', 'date_debut', 'date_fin']
    list_filter = ['type', 'actif', 'role_cible']
