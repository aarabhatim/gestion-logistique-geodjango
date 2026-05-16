from rest_framework import serializers
from django.contrib.gis.geos import Point
from fondateurs.serializers import ProduitSerializer, FondateurSerializer
from accounts.serializers import UserPublicSerializer
from .models import Commande, CommandeProduit, Avis


class CommandeProduitSerializer(serializers.ModelSerializer):
    produit_detail = ProduitSerializer(source='produit', read_only=True)

    class Meta:
        model = CommandeProduit
        fields = ['id', 'produit', 'produit_detail', 'quantite', 'prix_unitaire', 'sous_total']
        read_only_fields = ['prix_unitaire', 'sous_total']


class CommandeProduitCreateSerializer(serializers.Serializer):
    produit_id = serializers.IntegerField()
    quantite = serializers.IntegerField(min_value=1)


class CommandeSerializer(serializers.ModelSerializer):
    lignes = CommandeProduitSerializer(many=True, read_only=True)
    fondateur_detail = FondateurSerializer(source='fondateur', read_only=True)
    client_detail = UserPublicSerializer(source='client', read_only=True)
    transporteur_detail = UserPublicSerializer(source='transporteur', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    latitude_livraison = serializers.SerializerMethodField()
    longitude_livraison = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            'id', 'reference', 'statut', 'statut_display',
            'client', 'client_detail',
            'fondateur', 'fondateur_detail',
            'transporteur', 'transporteur_detail',
            'adresse_livraison', 'latitude_livraison', 'longitude_livraison',
            'etage_porte', 'instructions_livraison',
            'mode_paiement', 'est_paye',
            'sous_total', 'frais_livraison', 'reduction', 'total_price', 'code_promo_utilise',
            'livraison_immediate', 'livraison_programmee', 'estimated_delivery',
            'created_at', 'updated_at', 'livree_at',
            'est_signale', 'motif_signalement',
            'lignes',
        ]
        read_only_fields = [
            'reference', 'client', 'transporteur', 'statut',
            'sous_total', 'frais_livraison', 'total_price',
            'created_at', 'updated_at', 'livree_at',
        ]

    def get_latitude_livraison(self, obj):
        return obj.location_livraison.y if obj.location_livraison else None

    def get_longitude_livraison(self, obj):
        return obj.location_livraison.x if obj.location_livraison else None


class CommandeCreateSerializer(serializers.Serializer):
    fondateur_id = serializers.IntegerField()
    produits = CommandeProduitCreateSerializer(many=True)
    adresse_livraison = serializers.CharField()
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    etage_porte = serializers.CharField(required=False, allow_blank=True, default='')
    instructions_livraison = serializers.CharField(required=False, allow_blank=True, default='')
    mode_paiement = serializers.ChoiceField(choices=['CARTE', 'CASH'], default='CASH')
    livraison_immediate = serializers.BooleanField(default=True)
    livraison_programmee = serializers.DateTimeField(required=False, allow_null=True)
    code_promo = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        from fondateurs.models import Fondateur, Produit, CodePromo
        try:
            fondateur = Fondateur.objects.get(pk=data['fondateur_id'], is_verified=True)
        except Fondateur.DoesNotExist:
            raise serializers.ValidationError('Fondateur invalide ou non vérifié.')
        data['fondateur'] = fondateur

        # Vérifier chaque produit
        produits_valides = []
        sous_total = 0
        for item in data['produits']:
            try:
                produit = Produit.objects.get(pk=item['produit_id'], fondateur=fondateur, disponible=True)
            except Produit.DoesNotExist:
                raise serializers.ValidationError(f'Produit {item["produit_id"]} invalide.')
            if produit.stock < item['quantite']:
                raise serializers.ValidationError(f'Stock insuffisant pour {produit.nom}.')
            produits_valides.append({'produit': produit, 'quantite': item['quantite']})
            sous_total += float(produit.prix_effectif) * item['quantite']
        data['produits_valides'] = produits_valides
        data['sous_total'] = sous_total

        # Code promo
        reduction = 0
        if data.get('code_promo'):
            try:
                code = CodePromo.objects.get(code=data['code_promo'], fondateur=fondateur)
                if code.est_valide:
                    reduction = code.calculer_reduction(sous_total)
                    data['code_promo_obj'] = code
            except CodePromo.DoesNotExist:
                pass
        data['reduction'] = reduction

        return data

    def create(self, validated_data):
        from django.db import transaction
        request = self.context['request']
        fondateur = validated_data['fondateur']

        lat = validated_data.get('latitude')
        lon = validated_data.get('longitude')
        location = Point(float(lon), float(lat), srid=4326) if lat and lon else None

        # Frais de livraison
        frais = float(fondateur.frais_livraison_base)
        sous_total = validated_data['sous_total']
        reduction = validated_data['reduction']
        total = sous_total + frais - reduction

        with transaction.atomic():
            commande = Commande.objects.create(
                client=request.user,
                fondateur=fondateur,
                adresse_livraison=validated_data['adresse_livraison'],
                location_livraison=location,
                etage_porte=validated_data.get('etage_porte', ''),
                instructions_livraison=validated_data.get('instructions_livraison', ''),
                mode_paiement=validated_data['mode_paiement'],
                livraison_immediate=validated_data.get('livraison_immediate', True),
                livraison_programmee=validated_data.get('livraison_programmee'),
                sous_total=sous_total,
                frais_livraison=frais,
                reduction=reduction,
                total_price=total,
                code_promo_utilise=validated_data.get('code_promo', ''),
            )

            for item in validated_data['produits_valides']:
                produit = item['produit']
                qte = item['quantite']
                CommandeProduit.objects.create(
                    commande=commande,
                    produit=produit,
                    quantite=qte,
                    prix_unitaire=produit.prix_effectif,
                )
                # Décrémenter le stock
                produit.stock -= qte
                produit.nombre_commandes += qte
                produit.save(update_fields=['stock', 'nombre_commandes'])

            # Marquer le code promo utilisé
            if 'code_promo_obj' in validated_data:
                validated_data['code_promo_obj'].usage_count += 1
                validated_data['code_promo_obj'].save(update_fields=['usage_count'])

        return commande


class AvisSerializer(serializers.ModelSerializer):
    auteur_detail = UserPublicSerializer(source='auteur', read_only=True)

    class Meta:
        model = Avis
        fields = ['id', 'commande', 'auteur', 'auteur_detail', 'cible_type', 'note', 'commentaire', 'created_at']
        read_only_fields = ['auteur', 'created_at']


class AvisCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avis
        fields = ['cible_type', 'note', 'commentaire']

    def validate(self, data):
        commande = self.context['commande']
        auteur = self.context['request'].user
        if commande.statut != 'LIVREE':
            raise serializers.ValidationError('Vous ne pouvez noter que les commandes livrées.')
        if Avis.objects.filter(commande=commande, auteur=auteur, cible_type=data['cible_type']).exists():
            raise serializers.ValidationError('Vous avez déjà noté cet élément pour cette commande.')
        return data

    def create(self, validated_data):
        return Avis.objects.create(
            commande=self.context['commande'],
            auteur=self.context['request'].user,
            **validated_data,
        )
