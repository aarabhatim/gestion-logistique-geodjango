from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'full_name', 'role', 'is_banned', 'date_joined']
    list_filter = ['role', 'is_banned', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']

    fieldsets = UserAdmin.fieldsets + (
        ('DeliverMap', {'fields': ('role', 'phone', 'avatar', 'bio', 'location', 'is_banned', 'adresses_sauvegardees')}),
    )

    def full_name(self, obj):
        return obj.get_full_name()
    full_name.short_description = 'Nom complet'
