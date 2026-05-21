from rest_framework import serializers
from .models import SessionGroupe, MembreGroupe, ArticleGroupe


class ArticleGroupeSerializer(serializers.ModelSerializer):
    sous_total = serializers.ReadOnlyField()

    class Meta:
        model = ArticleGroupe
        fields = ['id', 'produit_id', 'nom_produit', 'quantite', 'prix_unitaire', 'sous_total']


class MembreGroupeSerializer(serializers.ModelSerializer):
    articles = ArticleGroupeSerializer(many=True, read_only=True)
    username = serializers.CharField(source='utilisateur.username', read_only=True)

    class Meta:
        model = MembreGroupe
        fields = ['id', 'username', 'est_pret', 'rejoint_le', 'articles']


class SessionGroupeSerializer(serializers.ModelSerializer):
    membres = MembreGroupeSerializer(many=True, read_only=True)
    lien_invitation = serializers.ReadOnlyField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = SessionGroupe
        fields = ['id', 'code', 'boutique_id', 'statut', 'lien_invitation', 'membres', 'total', 'created_at']

    def get_total(self, obj):
        return sum(
            article.sous_total
            for membre in obj.membres.all()
            for article in membre.articles.all()
        )
