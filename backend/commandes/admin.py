from django.contrib import admin
from .models import Commande, CommandeProduit, Avis

admin.site.register(Commande)
admin.site.register(CommandeProduit)
admin.site.register(Avis)
