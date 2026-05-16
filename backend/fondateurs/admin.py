from django.contrib import admin
from .models import Fondateur, Produit, ProduitImage

admin.site.register(Fondateur)
admin.site.register(Produit)
admin.site.register(ProduitImage)
