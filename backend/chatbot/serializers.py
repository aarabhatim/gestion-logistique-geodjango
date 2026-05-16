from rest_framework import serializers

from fondateurs.models import Produit


class ChatProduitSerializer(serializers.ModelSerializer):
    """Produit allégé pour le chat, avec assez d'infos boutique pour le panier."""
    prix_effectif = serializers.ReadOnlyField()
    en_stock = serializers.ReadOnlyField()
    fondateur = serializers.SerializerMethodField()
    fondateur_nom = serializers.CharField(source='fondateur.nom_boutique', read_only=True)
    categorie_display = serializers.CharField(source='get_categorie_display', read_only=True)

    class Meta:
        model = Produit
        fields = [
            'id', 'nom', 'description', 'prix', 'prix_promo', 'prix_effectif',
            'categorie', 'categorie_display', 'stock', 'en_stock',
            'image_principale', 'fondateur', 'fondateur_nom',
        ]

    def get_fondateur(self, obj):
        f = obj.fondateur
        return {
            'id': f.id,
            'nom_boutique': f.nom_boutique,
            'frais_livraison_base': str(f.frais_livraison_base),
            'commande_minimum': str(f.commande_minimum),
            'is_open': f.is_open,
        }


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)
    history = serializers.ListField(
        child=serializers.DictField(), required=False, default=list,
    )
