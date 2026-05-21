"""
python manage.py seed_delivermap
Peuple la base DeliverMap avec des donnees realistes marocaines.
Options:
  --clear   Vider la base avant de seeder
"""
import random
from datetime import timedelta
from django.contrib.gis.geos import Point, Polygon, LinearRing
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import CustomUser
from fondateurs.models import Fondateur, Produit, CodePromo
from transporteurs.models import Transporteur
from commandes.models import Commande, CommandeProduit, Avis
from livraisons.models import Livraison, PositionTracking
from notifications.models import Notification


# ─── Donnees marocaines realistes ─────────────────────────────────────────────

FONDATEURS_DATA = [
    # ── Casablanca ────────────────────────────────────────────────────────────
    {
        'username': 'marjane_maarif', 'first_name': 'Omar', 'last_name': 'Benali',
        'email': 'omar@marjane-maarif.ma', 'phone': '0661234501',
        'boutique': {
            'nom': 'Marjane Maarif', 'categorie': 'SUPERMARCHE',
            'description': 'Votre supermarche de quartier a Maarif. Large selection de produits frais et epicerie.',
            'adresse': 'Rue Abou Baker Essedik, Maarif, Casablanca',
            'ville': 'Casablanca', 'lat': 33.5892, 'lon': -7.6237,
            'rayon': 8.0, 'frais': 15.00, 'minimum': 80.00,
        }
    },
    {
        'username': 'pharmacie_atlas', 'first_name': 'Fatima', 'last_name': 'Alaoui',
        'email': 'fatima@pharmacie-atlas.ma', 'phone': '0661234502',
        'boutique': {
            'nom': 'Pharmacie Atlas', 'categorie': 'PHARMACIE',
            'description': 'Pharmacie de garde 7j/7. Medicaments, parapharmacie et conseils sante.',
            'adresse': 'Boulevard Hassan II, Centre-ville, Casablanca',
            'ville': 'Casablanca', 'lat': 33.5950, 'lon': -7.6190,
            'rayon': 5.0, 'frais': 10.00, 'minimum': 30.00,
        }
    },
    {
        'username': 'pizza_tazine', 'first_name': 'Youssef', 'last_name': 'El Fassi',
        'email': 'youssef@pizzatazine.ma', 'phone': '0661234503',
        'boutique': {
            'nom': 'Pizza & Tazine Express', 'categorie': 'RESTAURATION',
            'description': 'Fusion maroco-italienne: pizzas artisanales et tajines express. Livraison chaude garantie!',
            'adresse': 'Quartier Gauthier, Casablanca',
            'ville': 'Casablanca', 'lat': 33.5978, 'lon': -7.6318,
            'rayon': 6.0, 'frais': 20.00, 'minimum': 60.00,
        }
    },
    {
        'username': 'fashion_zara_casa', 'first_name': 'Nadia', 'last_name': 'Benjelloun',
        'email': 'nadia@fashioncasa.ma', 'phone': '0661234504',
        'boutique': {
            'nom': 'Fashion Casa Boutique', 'categorie': 'BOUTIQUE',
            'description': 'Mode marocaine contemporaine et internationale. Nouveautes chaque semaine.',
            'adresse': 'Morocco Mall, Sidi Bernoussi, Casablanca',
            'ville': 'Casablanca', 'lat': 33.5612, 'lon': -7.6891,
            'rayon': 12.0, 'frais': 25.00, 'minimum': 100.00,
        }
    },
    {
        'username': 'techno_market_casa', 'first_name': 'Amine', 'last_name': 'Chraibi',
        'email': 'amine@technomarket.ma', 'phone': '0661234505',
        'boutique': {
            'nom': 'TechnoMarket Casa', 'categorie': 'ELECTRONIQUE',
            'description': 'Electronique, smartphones, informatique et accessoires. Prix concurrentiels.',
            'adresse': 'Derb Omar, Casablanca',
            'ville': 'Casablanca', 'lat': 33.5823, 'lon': -7.6091,
            'rayon': 10.0, 'frais': 30.00, 'minimum': 200.00,
        }
    },
    # ── Rabat ─────────────────────────────────────────────────────────────────
    {
        'username': 'bio_nature_rabat', 'first_name': 'Samia', 'last_name': 'Tahiri',
        'email': 'samia@bionature.ma', 'phone': '0661234506',
        'boutique': {
            'nom': 'Bio & Nature Maroc', 'categorie': 'SUPERMARCHE',
            'description': 'Produits bio, naturels et locaux. Soutien aux agriculteurs marocains.',
            'adresse': 'Agdal, Rabat',
            'ville': 'Rabat', 'lat': 33.9919, 'lon': -6.8498,
            'rayon': 7.0, 'frais': 18.00, 'minimum': 70.00,
        }
    },
    {
        'username': 'couscous_rabat', 'first_name': 'Hakima', 'last_name': 'Moujahid',
        'email': 'hakima@couscousrabat.ma', 'phone': '0661234507',
        'boutique': {
            'nom': 'Dar Couscous Rabat', 'categorie': 'RESTAURATION',
            'description': 'Cuisine marocaine authentique. Couscous, pastilla, mechoui. Traiteur disponible.',
            'adresse': 'Avenue Mohammed V, Hassan, Rabat',
            'ville': 'Rabat', 'lat': 34.0209, 'lon': -6.8416,
            'rayon': 8.0, 'frais': 22.00, 'minimum': 80.00,
        }
    },
    # ── Marrakech ─────────────────────────────────────────────────────────────
    {
        'username': 'argan_marrakech', 'first_name': 'Khadija', 'last_name': 'Amrani',
        'email': 'khadija@argan-marrakech.ma', 'phone': '0661234508',
        'boutique': {
            'nom': 'Argan & Epices Marrakech', 'categorie': 'SUPERMARCHE',
            'description': 'Epices du souk, huile d\'argan, safran et produits du terroir marocain.',
            'adresse': 'Rue Mouassine, Medina, Marrakech',
            'ville': 'Marrakech', 'lat': 31.6295, 'lon': -7.9811,
            'rayon': 6.0, 'frais': 20.00, 'minimum': 60.00,
        }
    },
    {
        'username': 'riad_resto_marrakech', 'first_name': 'Hamza', 'last_name': 'Benhaddou',
        'email': 'hamza@riadresto.ma', 'phone': '0661234509',
        'boutique': {
            'nom': 'Riad Restaurant Express', 'categorie': 'RESTAURATION',
            'description': 'Saveurs du Riad en livraison. Tajines, brochettes, salades marocaines fraichement preparees.',
            'adresse': 'Gueliz, Marrakech',
            'ville': 'Marrakech', 'lat': 31.6340, 'lon': -8.0137,
            'rayon': 7.0, 'frais': 25.00, 'minimum': 70.00,
        }
    },
    {
        'username': 'atlas_pharma_marrakech', 'first_name': 'Zineb', 'last_name': 'Ouazzani',
        'email': 'zineb@atlaspharma.ma', 'phone': '0661234510',
        'boutique': {
            'nom': 'Atlas Pharmacie Marrakech', 'categorie': 'PHARMACIE',
            'description': 'Pharmacie centrale. Medicaments, produits veterinaires et parapharmacie.',
            'adresse': 'Avenue Mohammed VI, Gueliz, Marrakech',
            'ville': 'Marrakech', 'lat': 31.6390, 'lon': -8.0082,
            'rayon': 5.0, 'frais': 12.00, 'minimum': 40.00,
        }
    },
    # ── Fes ───────────────────────────────────────────────────────────────────
    {
        'username': 'artisanat_fes', 'first_name': 'Moulay', 'last_name': 'Hafidi',
        'email': 'moulay@artisanatfes.ma', 'phone': '0661234511',
        'boutique': {
            'nom': 'Artisanat Fassi Authentique', 'categorie': 'BOUTIQUE',
            'description': 'Poterie, zellige, cuir et tapis artisanaux directement des ateliers de la medina.',
            'adresse': 'Rue Talaa Kebira, Medina, Fes',
            'ville': 'Fes', 'lat': 34.0635, 'lon': -4.9750,
            'rayon': 8.0, 'frais': 30.00, 'minimum': 150.00,
        }
    },
    {
        'username': 'techno_fes', 'first_name': 'Ismail', 'last_name': 'Lahrizi',
        'email': 'ismail@technofes.ma', 'phone': '0661234512',
        'boutique': {
            'nom': 'TechnoFes Electronique', 'categorie': 'ELECTRONIQUE',
            'description': 'Materiel informatique, telephonie et accessoires au meilleur prix.',
            'adresse': 'Avenue Hassan II, Ville Nouvelle, Fes',
            'ville': 'Fes', 'lat': 34.0381, 'lon': -5.0000,
            'rayon': 9.0, 'frais': 28.00, 'minimum': 180.00,
        }
    },
    # ── Tanger ────────────────────────────────────────────────────────────────
    {
        'username': 'souk_tanger', 'first_name': 'Abdelkrim', 'last_name': 'Riffi',
        'email': 'abdelkrim@souk-tanger.ma', 'phone': '0661234513',
        'boutique': {
            'nom': 'Souk Tanger Direct', 'categorie': 'SUPERMARCHE',
            'description': 'Produits frais du marche, epicerie fine et produits du nord du Maroc.',
            'adresse': 'Boulevard Pasteur, Tanger',
            'ville': 'Tanger', 'lat': 35.7673, 'lon': -5.8005,
            'rayon': 7.0, 'frais': 16.00, 'minimum': 65.00,
        }
    },
    {
        'username': 'burger_tanger', 'first_name': 'Yasmine', 'last_name': 'Sekkat',
        'email': 'yasmine@burgertanger.ma', 'phone': '0661234514',
        'boutique': {
            'nom': 'Burger & Co Tanger', 'categorie': 'RESTAURATION',
            'description': 'Burgers artisanaux, wraps et frites maison. Saveurs americaines en coeur de Tanger.',
            'adresse': 'Avenue des FAR, Tanger',
            'ville': 'Tanger', 'lat': 35.7720, 'lon': -5.8138,
            'rayon': 6.0, 'frais': 18.00, 'minimum': 55.00,
        }
    },
    {
        'username': 'pharma_iberia_tng', 'first_name': 'Imane', 'last_name': 'Bennani',
        'email': 'imane@pharma-iberia.ma', 'phone': '0661234561',
        'boutique': {
            'nom': 'Pharmacie Iberia Tanger', 'categorie': 'PHARMACIE',
            'description': 'Pharmacie 24h/7j au coeur du quartier Iberia, parapharmacie et conseils sante.',
            'adresse': 'Place Iberia, Tanger',
            'ville': 'Tanger', 'lat': 35.7702, 'lon': -5.8048,
            'rayon': 7.0, 'frais': 14.00, 'minimum': 50.00,
        }
    },
    {
        'username': 'tech_malabata', 'first_name': 'Reda', 'last_name': 'Tazi',
        'email': 'reda@techmalabata.ma', 'phone': '0661234562',
        'boutique': {
            'nom': 'Tech Hub Malabata', 'categorie': 'ELECTRONIQUE',
            'description': 'Magasin high-tech a Malabata : smartphones, accessoires, gaming et reparation.',
            'adresse': 'Avenue Mohammed VI, Malabata, Tanger',
            'ville': 'Tanger', 'lat': 35.7793, 'lon': -5.7672,
            'rayon': 9.0, 'frais': 25.00, 'minimum': 120.00,
        }
    },
    {
        'username': 'medina_artisan_tng', 'first_name': 'Khadija', 'last_name': 'El Idrissi',
        'email': 'khadija@medinatanger.ma', 'phone': '0661234563',
        'boutique': {
            'nom': 'Medina Artisanat Tanger', 'categorie': 'BOUTIQUE',
            'description': 'Artisanat marocain authentique : caftans, babouches, ceramique et zellige du Nord.',
            'adresse': 'Petit Socco, Medina, Tanger',
            'ville': 'Tanger', 'lat': 35.7892, 'lon': -5.8125,
            'rayon': 6.0, 'frais': 20.00, 'minimum': 90.00,
        }
    },
    {
        'username': 'cafe_hafa_tng', 'first_name': 'Othmane', 'last_name': 'Chraibi',
        'email': 'othmane@cafehafa.ma', 'phone': '0661234564',
        'boutique': {
            'nom': 'Cafe Hafa Express', 'categorie': 'RESTAURATION',
            'description': 'The a la menthe et patisseries marocaines avec vue mer. Livraison rapide.',
            'adresse': 'Marshan, Tanger',
            'ville': 'Tanger', 'lat': 35.7838, 'lon': -5.8245,
            'rayon': 5.0, 'frais': 12.00, 'minimum': 40.00,
        }
    },
    {
        'username': 'beach_market_tng', 'first_name': 'Salma', 'last_name': 'Lahlou',
        'email': 'salma@beachmarket.ma', 'phone': '0661234565',
        'boutique': {
            'nom': 'Beach Market Tanger Bay', 'categorie': 'SUPERMARCHE',
            'description': 'Mini-marche moderne en bord de plage : snacks, boissons, glaces et essentiels.',
            'adresse': 'Boulevard Mohammed VI, Tanger Bay',
            'ville': 'Tanger', 'lat': 35.7740, 'lon': -5.7910,
            'rayon': 8.0, 'frais': 17.00, 'minimum': 60.00,
        }
    },
    {
        'username': 'mode_tng_charf', 'first_name': 'Nada', 'last_name': 'Saidi',
        'email': 'nada@modecharf.ma', 'phone': '0661234566',
        'boutique': {
            'nom': 'Mode & Style Charf', 'categorie': 'BOUTIQUE',
            'description': 'Pret-a-porter homme/femme tendance, marques marocaines et internationales.',
            'adresse': 'Avenue Mohammed V, Charf, Tanger',
            'ville': 'Tanger', 'lat': 35.7549, 'lon': -5.8118,
            'rayon': 7.5, 'frais': 22.00, 'minimum': 150.00,
        }
    },
    # ── Agadir ────────────────────────────────────────────────────────────────
    {
        'username': 'fresh_agadir', 'first_name': 'Rachida', 'last_name': 'Bouazza',
        'email': 'rachida@freshagadir.ma', 'phone': '0661234515',
        'boutique': {
            'nom': 'Fresh Market Agadir', 'categorie': 'SUPERMARCHE',
            'description': 'Fruits et legumes frais, produits locaux et bio. Livraison le matin meme.',
            'adresse': 'Talborjt, Agadir',
            'ville': 'Agadir', 'lat': 30.4278, 'lon': -9.5981,
            'rayon': 8.0, 'frais': 15.00, 'minimum': 70.00,
        }
    },
]

PRODUITS_PAR_CATEGORIE = {
    'SUPERMARCHE': [
        {'nom': 'Huile d\'olive Saiss 1L', 'prix': 45.00, 'categorie': 'ALIMENTAIRE', 'stock': 100},
        {'nom': 'Lait Centrale 1L (lot x6)', 'prix': 38.50, 'categorie': 'BOISSONS', 'stock': 80},
        {'nom': 'Pain de mie complet', 'prix': 12.00, 'categorie': 'ALIMENTAIRE', 'stock': 50},
        {'nom': 'Yaourt Danone (lot x8)', 'prix': 32.00, 'categorie': 'ALIMENTAIRE', 'stock': 60},
        {'nom': 'Fromage Kiri (lot x16)', 'prix': 28.50, 'categorie': 'ALIMENTAIRE', 'stock': 45},
        {'nom': 'Eau Sidi Ali 1.5L (lot x6)', 'prix': 24.00, 'categorie': 'BOISSONS', 'stock': 200},
        {'nom': 'Pates Rivoire & Carret 500g', 'prix': 8.50, 'categorie': 'ALIMENTAIRE', 'stock': 150},
        {'nom': 'Riz basmati premium 1kg', 'prix': 22.00, 'categorie': 'ALIMENTAIRE', 'stock': 90},
        {'nom': 'Thon en boite Bahia (x3)', 'prix': 35.00, 'categorie': 'ALIMENTAIRE', 'stock': 70},
        {'nom': 'Shampooing Pantene 400ml', 'prix': 42.00, 'categorie': 'HYGIENE', 'stock': 40},
        {'nom': 'Dentifrice Signal 75ml (x2)', 'prix': 18.50, 'categorie': 'HYGIENE', 'stock': 55},
        {'nom': 'Savon Dove lot x4', 'prix': 28.00, 'categorie': 'HYGIENE', 'stock': 65},
        {'nom': 'Cafe Nescafe 200g', 'prix': 52.00, 'categorie': 'BOISSONS', 'stock': 75},
        {'nom': 'Beurre President 250g', 'prix': 35.00, 'categorie': 'ALIMENTAIRE', 'stock': 60},
    ],
    'PHARMACIE': [
        {'nom': 'Doliprane 1000mg (boite x8)', 'prix': 18.50, 'categorie': 'MEDICAMENTS', 'stock': 200},
        {'nom': 'Vitamine C Sandoz 1000mg', 'prix': 32.00, 'categorie': 'MEDICAMENTS', 'stock': 150},
        {'nom': 'Creme Nivea Sensitive 150ml', 'prix': 48.00, 'categorie': 'HYGIENE', 'stock': 60},
        {'nom': 'Gel hydroalcoolique 500ml', 'prix': 25.00, 'categorie': 'HYGIENE', 'stock': 100},
        {'nom': 'Masque chirurgical (boite x50)', 'prix': 45.00, 'categorie': 'HYGIENE', 'stock': 80},
        {'nom': 'Thermometre digital', 'prix': 85.00, 'categorie': 'AUTRE', 'stock': 30},
        {'nom': 'Test COVID rapide', 'prix': 55.00, 'categorie': 'AUTRE', 'stock': 50},
        {'nom': 'Spasfon comprimes x6', 'prix': 22.50, 'categorie': 'MEDICAMENTS', 'stock': 120},
        {'nom': 'Omega 3 capsules x60', 'prix': 85.00, 'categorie': 'MEDICAMENTS', 'stock': 90},
        {'nom': 'Bande elastique 10cm', 'prix': 15.00, 'categorie': 'AUTRE', 'stock': 70},
    ],
    'RESTAURATION': [
        {'nom': 'Pizza Margherita (30cm)', 'prix': 55.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Pizza Poulet Champignon', 'prix': 65.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Tajine Poulet Citron', 'prix': 75.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Tajine Kefta Tomates', 'prix': 70.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Burger Beef 200g', 'prix': 60.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Salade Marocaine', 'prix': 30.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Couscous Royal (pour 2)', 'prix': 120.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Jus d\'orange frais 1L', 'prix': 25.00, 'categorie': 'BOISSONS', 'stock': 999},
        {'nom': 'The a la menthe pot', 'prix': 15.00, 'categorie': 'BOISSONS', 'stock': 999},
        {'nom': 'Pastilla au poulet', 'prix': 85.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
        {'nom': 'Mechoui (demi-portion)', 'prix': 150.00, 'categorie': 'ALIMENTAIRE', 'stock': 30},
        {'nom': 'Assiette brochettes x5', 'prix': 65.00, 'categorie': 'ALIMENTAIRE', 'stock': 999},
    ],
    'BOUTIQUE': [
        {'nom': 'Djellaba femme premium', 'prix': 450.00, 'categorie': 'VETEMENTS', 'stock': 25},
        {'nom': 'Kaftan brode traditionnel', 'prix': 680.00, 'categorie': 'VETEMENTS', 'stock': 15},
        {'nom': 'Jean slim homme', 'prix': 220.00, 'categorie': 'VETEMENTS', 'stock': 40},
        {'nom': 'Robe ete casual', 'prix': 185.00, 'categorie': 'VETEMENTS', 'stock': 30},
        {'nom': 'Sneakers Adidas Ultraboost', 'prix': 850.00, 'categorie': 'VETEMENTS', 'stock': 20},
        {'nom': 'Sac cuir artisanal', 'prix': 320.00, 'categorie': 'VETEMENTS', 'stock': 18},
        {'nom': 'Foulard soie marocain', 'prix': 95.00, 'categorie': 'VETEMENTS', 'stock': 50},
        {'nom': 'Babouches cuir dore', 'prix': 280.00, 'categorie': 'VETEMENTS', 'stock': 35},
        {'nom': 'Veste en cuir marocain', 'prix': 750.00, 'categorie': 'VETEMENTS', 'stock': 12},
        {'nom': 'Plateau zellige artisanal', 'prix': 380.00, 'categorie': 'AUTRE', 'stock': 20},
    ],
    'ELECTRONIQUE': [
        {'nom': 'iPhone 15 128GB', 'prix': 12500.00, 'categorie': 'ELECTRONIQUE', 'stock': 10},
        {'nom': 'Samsung Galaxy A54', 'prix': 4200.00, 'categorie': 'ELECTRONIQUE', 'stock': 15},
        {'nom': 'Casque Bluetooth Sony WH-1000', 'prix': 2800.00, 'categorie': 'ELECTRONIQUE', 'stock': 20},
        {'nom': 'Chargeur rapide 65W USB-C', 'prix': 180.00, 'categorie': 'ELECTRONIQUE', 'stock': 50},
        {'nom': 'Coque iPhone 15 Pro', 'prix': 85.00, 'categorie': 'ELECTRONIQUE', 'stock': 80},
        {'nom': 'Ecouteurs AirPods Pro', 'prix': 2200.00, 'categorie': 'ELECTRONIQUE', 'stock': 12},
        {'nom': 'Cle USB 64GB USB 3.0', 'prix': 95.00, 'categorie': 'ELECTRONIQUE', 'stock': 60},
        {'nom': 'Powerbank 20000mAh', 'prix': 280.00, 'categorie': 'ELECTRONIQUE', 'stock': 35},
        {'nom': 'Tablette Samsung Galaxy Tab A8', 'prix': 3200.00, 'categorie': 'ELECTRONIQUE', 'stock': 8},
        {'nom': 'Montre connectee Huawei Band 7', 'prix': 650.00, 'categorie': 'ELECTRONIQUE', 'stock': 25},
        {'nom': 'Camera de surveillance WiFi', 'prix': 480.00, 'categorie': 'ELECTRONIQUE', 'stock': 18},
    ],
}

TRANSPORTEURS_DATA = [
    # Casablanca
    {'username': 'karim_driver', 'first_name': 'Karim', 'last_name': 'Mansouri', 'phone': '0672000101',
     'vehicule': 'MOTO', 'plaque': 'MA-12345-A', 'capacite': 20, 'lat': 33.5850, 'lon': -7.6150},
    {'username': 'hamid_delivery', 'first_name': 'Hamid', 'last_name': 'Ziani', 'phone': '0672000102',
     'vehicule': 'MOTO', 'plaque': 'MA-23456-B', 'capacite': 25, 'lat': 33.5920, 'lon': -7.6080},
    {'username': 'rachid_transport', 'first_name': 'Rachid', 'last_name': 'Oukili', 'phone': '0672000103',
     'vehicule': 'VOITURE', 'plaque': 'MA-34567-C', 'capacite': 150, 'lat': 33.5780, 'lon': -7.6220},
    {'username': 'hassan_express', 'first_name': 'Hassan', 'last_name': 'El Amrani', 'phone': '0672000104',
     'vehicule': 'CAMIONNETTE', 'plaque': 'MA-45678-D', 'capacite': 500, 'lat': 33.5650, 'lon': -7.6300},
    {'username': 'yassine_livraison', 'first_name': 'Yassine', 'last_name': 'Benhaddou', 'phone': '0672000105',
     'vehicule': 'MOTO', 'plaque': 'MA-56789-E', 'capacite': 15, 'lat': 33.5990, 'lon': -7.6050},
    {'username': 'mourad_fast', 'first_name': 'Mourad', 'last_name': 'Lahsini', 'phone': '0672000106',
     'vehicule': 'VOITURE', 'plaque': 'MA-67890-F', 'capacite': 100, 'lat': 33.5730, 'lon': -7.6180},
    {'username': 'driss_cargo', 'first_name': 'Driss', 'last_name': 'Naciri', 'phone': '0672000107',
     'vehicule': 'CAMION', 'plaque': 'MA-78901-G', 'capacite': 2000, 'lat': 33.5550, 'lon': -7.6450},
    {'username': 'tariq_speed', 'first_name': 'Tariq', 'last_name': 'El Idrissi', 'phone': '0672000108',
     'vehicule': 'MOTO', 'plaque': 'MA-89012-H', 'capacite': 18, 'lat': 33.6010, 'lon': -7.6000},
    {'username': 'bilal_moto', 'first_name': 'Bilal', 'last_name': 'Saidi', 'phone': '0672000109',
     'vehicule': 'MOTO', 'plaque': 'MA-90123-I', 'capacite': 22, 'lat': 33.5840, 'lon': -7.6350},
    {'username': 'omar_cargo', 'first_name': 'Omar', 'last_name': 'Cherkaoui', 'phone': '0672000110',
     'vehicule': 'CAMIONNETTE', 'plaque': 'MA-01234-J', 'capacite': 600, 'lat': 33.5710, 'lon': -7.6410},
    # Rabat
    {'username': 'nour_rabat', 'first_name': 'Nour', 'last_name': 'Berrada', 'phone': '0672000111',
     'vehicule': 'VOITURE', 'plaque': 'RA-11111-K', 'capacite': 120, 'lat': 34.0100, 'lon': -6.8300},
    {'username': 'adam_velo', 'first_name': 'Adam', 'last_name': 'El Fassi', 'phone': '0672000112',
     'vehicule': 'MOTO', 'plaque': 'RA-22222-L', 'capacite': 15, 'lat': 33.9980, 'lon': -6.8550},
    # Marrakech
    {'username': 'hassan_marrakech', 'first_name': 'Hassan', 'last_name': 'Roudani', 'phone': '0672000113',
     'vehicule': 'MOTO', 'plaque': 'MK-33333-M', 'capacite': 20, 'lat': 31.6340, 'lon': -8.0000},
    {'username': 'yto_marrakech', 'first_name': 'Yto', 'last_name': 'Amahrouch', 'phone': '0672000114',
     'vehicule': 'VOITURE', 'plaque': 'MK-44444-N', 'capacite': 130, 'lat': 31.6280, 'lon': -8.0090},
    # Fes
    {'username': 'khalil_fes', 'first_name': 'Khalil', 'last_name': 'Maamouri', 'phone': '0672000115',
     'vehicule': 'MOTO', 'plaque': 'FE-55555-O', 'capacite': 18, 'lat': 34.0500, 'lon': -4.9900},
    # Tanger
    {'username': 'soufiane_tanger', 'first_name': 'Soufiane', 'last_name': 'Rifai', 'phone': '0672000116',
     'vehicule': 'VOITURE', 'plaque': 'TA-66666-P', 'capacite': 110, 'lat': 35.7700, 'lon': -5.8100},
    # Agadir
    {'username': 'redouan_agadir', 'first_name': 'Redouan', 'last_name': 'Bounasser', 'phone': '0672000117',
     'vehicule': 'MOTO', 'plaque': 'AG-77777-Q', 'capacite': 20, 'lat': 30.4250, 'lon': -9.6000},
]

CLIENTS_DATA = [
    # Casablanca
    {'username': 'sara_client', 'first_name': 'Sara', 'last_name': 'Benchekroun', 'phone': '0650000201',
     'email': 'sara@example.ma', 'lat': 33.5880, 'lon': -7.6280},
    {'username': 'mehdi_user', 'first_name': 'Mehdi', 'last_name': 'Lyoussi', 'phone': '0650000202',
     'email': 'mehdi@example.ma', 'lat': 33.5950, 'lon': -7.6150},
    {'username': 'aicha_casa', 'first_name': 'Aicha', 'last_name': 'Berrada', 'phone': '0650000203',
     'email': 'aicha@example.ma', 'lat': 33.5820, 'lon': -7.6320},
    {'username': 'khalid_maarif', 'first_name': 'Khalid', 'last_name': 'Tazi', 'phone': '0650000204',
     'email': 'khalid@example.ma', 'lat': 33.5901, 'lon': -7.6250},
    {'username': 'zineb_habous', 'first_name': 'Zineb', 'last_name': 'Skalli', 'phone': '0650000205',
     'email': 'zineb@example.ma', 'lat': 33.5760, 'lon': -7.6100},
    {'username': 'adam_client', 'first_name': 'Adam', 'last_name': 'El Ouafi', 'phone': '0650000206',
     'email': 'adam@example.ma', 'lat': 33.5830, 'lon': -7.6200},
    {'username': 'leila_user', 'first_name': 'Leila', 'last_name': 'Moussaid', 'phone': '0650000207',
     'email': 'leila@example.ma', 'lat': 33.5970, 'lon': -7.6400},
    {'username': 'ibrahim_casa', 'first_name': 'Ibrahim', 'last_name': 'Hajji', 'phone': '0650000208',
     'email': 'ibrahim@example.ma', 'lat': 33.5680, 'lon': -7.6050},
    {'username': 'nadia_anfa', 'first_name': 'Nadia', 'last_name': 'Regragui', 'phone': '0650000209',
     'email': 'nadia_anfa@example.ma', 'lat': 33.5790, 'lon': -7.6580},
    {'username': 'amine_gauthier', 'first_name': 'Amine', 'last_name': 'Filali', 'phone': '0650000210',
     'email': 'amine_g@example.ma', 'lat': 33.5960, 'lon': -7.6320},
    {'username': 'fatima_racine', 'first_name': 'Fatima', 'last_name': 'Zouiten', 'phone': '0650000211',
     'email': 'fatima_r@example.ma', 'lat': 33.5930, 'lon': -7.6390},
    {'username': 'youssef_casa', 'first_name': 'Youssef', 'last_name': 'Benkirane', 'phone': '0650000212',
     'email': 'youssef_c@example.ma', 'lat': 33.5850, 'lon': -7.6150},
    # Rabat
    {'username': 'soukaina_rabat', 'first_name': 'Soukaina', 'last_name': 'Alami', 'phone': '0650000213',
     'email': 'soukaina@example.ma', 'lat': 34.0120, 'lon': -6.8250},
    {'username': 'mounir_agdal', 'first_name': 'Mounir', 'last_name': 'Lahlou', 'phone': '0650000214',
     'email': 'mounir@example.ma', 'lat': 33.9950, 'lon': -6.8520},
    # Marrakech
    {'username': 'houda_marrakech', 'first_name': 'Houda', 'last_name': 'Benhammou', 'phone': '0650000215',
     'email': 'houda@example.ma', 'lat': 31.6350, 'lon': -8.0050},
    {'username': 'saad_gueliz', 'first_name': 'Saad', 'last_name': 'Ennaji', 'phone': '0650000216',
     'email': 'saad@example.ma', 'lat': 31.6310, 'lon': -8.0160},
    # Fes
    {'username': 'ghita_fes', 'first_name': 'Ghita', 'last_name': 'Chaabi', 'phone': '0650000217',
     'email': 'ghita@example.ma', 'lat': 34.0550, 'lon': -4.9850},
    # Tanger
    {'username': 'rim_tanger', 'first_name': 'Rim', 'last_name': 'Benchama', 'phone': '0650000218',
     'email': 'rim@example.ma', 'lat': 35.7690, 'lon': -5.8050},
    # Agadir
    {'username': 'jamal_agadir', 'first_name': 'Jamal', 'last_name': 'Oulhaj', 'phone': '0650000219',
     'email': 'jamal@example.ma', 'lat': 30.4300, 'lon': -9.5940},
    {'username': 'assia_agadir', 'first_name': 'Assia', 'last_name': 'Benali', 'phone': '0650000220',
     'email': 'assia@example.ma', 'lat': 30.4200, 'lon': -9.6050},
]

ADRESSES_LIVRAISON = [
    ('12 Rue Moulay Hassan, Maarif, Casablanca', 33.5892, -7.6210),
    ('45 Bd Zerktouni, Gauthier, Casablanca', 33.5978, -7.6338),
    ('Rue Oqba Ben Nafiaa, Hay Hassani, Casablanca', 33.5650, -7.6450),
    ('22 Av Mohammed VI, Anfa, Casablanca', 33.5812, -7.6521),
    ('Boulevard d\'Anfa, Casablanca', 33.5789, -7.6620),
    ('Rue Ibn Rochd, Maarif, Casablanca', 33.5870, -7.6290),
    ('Quartier Racine, Casablanca', 33.5934, -7.6380),
    ('Avenue Hassan II, Centre-ville', 33.5950, -7.6190),
    ('Avenue Mohammed V, Agdal, Rabat', 34.0100, -6.8400),
    ('Hay Riad, Rabat', 33.9800, -6.8700),
    ('Rue Mouassine, Medina, Marrakech', 31.6295, -7.9811),
    ('Avenue Mohammed VI, Gueliz, Marrakech', 31.6380, -8.0090),
    ('Boulevard Pasteur, Tanger', 35.7673, -5.8005),
    ('Talborjt, Agadir', 30.4278, -9.5981),
    ('Rue Talaa Kebira, Fes', 34.0635, -4.9750),
]

COMMENTAIRES_FONDATEUR = [
    'Tres bonne qualite, je recommande!',
    'Livraison rapide, produits frais.',
    'Conforme a la description.',
    'Excellent service, a recommander.',
    'Bonne experience globale.',
    'Super boutique, reviendrai!',
    'Produits authentiques et de qualite.',
    'Service impeccable, merci!',
    '',
]

COMMENTAIRES_TRANSPORTEUR = [
    'Chauffeur tres ponctuel!',
    'Livraison soigneuse, merci.',
    'Contact agreable, rapide.',
    'Professionnel et souriant.',
    'Tres bonne experience.',
    '',
]


def creer_zone_livraison(lat, lon, rayon_deg=0.05):
    coords = [
        (lon - rayon_deg, lat - rayon_deg),
        (lon + rayon_deg, lat - rayon_deg),
        (lon + rayon_deg, lat + rayon_deg),
        (lon - rayon_deg, lat + rayon_deg),
        (lon - rayon_deg, lat - rayon_deg),
    ]
    ring = LinearRing(coords)
    return Polygon(ring, srid=4326)


class Command(BaseCommand):
    help = 'Seed DeliverMap database with realistic Moroccan demo data.'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear database before seeding')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('[CLEAR] Vidage de la base...')
            self._vider_base()

        self.stdout.write(self.style.SUCCESS('[START] Seeding DeliverMap...\n'))

        with transaction.atomic():
            admin = self._creer_admin()
            clients = self._creer_clients()
            fondateurs, boutiques = self._creer_fondateurs()
            self._creer_produits(boutiques)
            self._creer_codes_promo(boutiques)
            transporteurs = self._creer_transporteurs()
            commandes = self._creer_commandes(clients, boutiques, transporteurs)
            try:
                self._creer_avis(commandes)
            except AttributeError:
                pass
            try:
                self._creer_notifications(clients, fondateurs, transporteurs)
            except AttributeError:
                pass

        self.stdout.write(self.style.SUCCESS('\n[OK] Base de donnees remplie avec succes!'))
        self.stdout.write(f'   Admin:         admin@delivermap.ma / admin2025')
        self.stdout.write(f'   Fondateurs:    {len(boutiques)} boutiques dans 5 villes')
        self.stdout.write(f'   Transporteurs: {len(transporteurs)} chauffeurs')
        self.stdout.write(f'   Clients:       {len(clients)} utilisateurs')
        nb_cmd = len(commandes) if commandes else 0
        self.stdout.write(f'   Commandes:     {nb_cmd} creees')

    def _vider_base(self):
        PositionTracking.objects.all().delete()
        Livraison.objects.all().delete()
        Avis.objects.all().delete()
        CommandeProduit.objects.all().delete()
        Commande.objects.all().delete()
        Notification.objects.all().delete()
        CodePromo.objects.all().delete()
        Produit.objects.all().delete()
        Transporteur.objects.all().delete()
        Fondateur.objects.all().delete()
        CustomUser.objects.filter(is_superuser=False).delete()
        self.stdout.write('  [OK] Base videe')

    def _creer_admin(self):
        user, created = CustomUser.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@delivermap.ma',
                'first_name': 'Super',
                'last_name': 'Admin',
                'role': 'ADMIN',
                'phone': '0600000000',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            user.set_password('admin2025')
            user.save()
            self.stdout.write('  [OK] Admin cree')
        return user

    def _creer_clients(self):
        clients = []
        for data in CLIENTS_DATA:
            user, created = CustomUser.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': data['email'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'CLIENT',
                    'phone': data['phone'],
                    'location': Point(data['lon'], data['lat'], srid=4326),
                }
            )
            if created:
                user.set_password('client2025')
                user.save()
            clients.append(user)
        self.stdout.write(f'  [OK] {len(clients)} clients crees')
        return clients

    def _creer_fondateurs(self):
        fondateurs_users = []
        boutiques = []
        for data in FONDATEURS_DATA:
            b = data['boutique']
            user, created = CustomUser.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': data['email'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'FONDATEUR',
                    'phone': data['phone'],
                    'location': Point(b['lon'], b['lat'], srid=4326),
                }
            )
            if created:
                user.set_password('fondateur2025')
                user.save()

            fondateur, _ = Fondateur.objects.get_or_create(
                user=user,
                defaults={
                    'nom_boutique': b['nom'],
                    'categorie': b['categorie'],
                    'description': b['description'],
                    'adresse': b['adresse'],
                    'ville': b.get('ville', 'Casablanca'),
                    'location': Point(b['lon'], b['lat'], srid=4326),
                    'zone_livraison': creer_zone_livraison(b['lat'], b['lon'], b['rayon'] / 111),
                    'rayon_livraison_km': b['rayon'],
                    'frais_livraison_base': b['frais'],
                    'commande_minimum': b['minimum'],
                    'is_verified': True,
                    'is_open': True,
                    'note_moyenne': round(random.uniform(3.8, 5.0), 1),
                    'nombre_avis': random.randint(20, 300),
                    'nombre_commandes': random.randint(50, 800),
                    'horaires': {
                        'lun': '08:00-22:00', 'mar': '08:00-22:00',
                        'mer': '08:00-22:00', 'jeu': '08:00-22:00',
                        'ven': '08:00-23:00', 'sam': '09:00-23:00',
                        'dim': '10:00-20:00',
                    },
                }
            )
            fondateurs_users.append(user)
            boutiques.append(fondateur)
        self.stdout.write(f'  [OK] {len(boutiques)} fondateurs/boutiques crees')
        return fondateurs_users, boutiques

    def _creer_produits(self, boutiques):
        total = 0
        for fondateur in boutiques:
            produits_data = PRODUITS_PAR_CATEGORIE.get(fondateur.categorie, PRODUITS_PAR_CATEGORIE['SUPERMARCHE'])
            for p_data in produits_data:
                Produit.objects.get_or_create(
                    fondateur=fondateur,
                    nom=p_data['nom'],
                    defaults={
                        'description': f"{p_data['nom']} - disponible chez {fondateur.nom_boutique}",
                        'prix': p_data['prix'],
                        'stock': p_data['stock'],
                        'categorie': p_data['categorie'],
                        'disponible': True,
                        'nombre_commandes': random.randint(5, 150),
                    }
                )
                total += 1
        self.stdout.write(f'  [OK] {total} produits crees')

    def _creer_codes_promo(self, boutiques):
        for fondateur in boutiques:
            CodePromo.objects.get_or_create(
                code=f'BIENVENUE{fondateur.pk}',
                defaults={
                    'fondateur': fondateur,
                    'type_reduction': 'POURCENTAGE',
                    'valeur': 10,
                    'montant_minimum': fondateur.commande_minimum,
                    'usage_max': 500,
                    'actif': True,
                }
            )
            CodePromo.objects.get_or_create(
                code=f'FIDELE{fondateur.pk}',
                defaults={
                    'fondateur': fondateur,
                    'type_reduction': 'MONTANT',
                    'valeur': 20,
                    'montant_minimum': float(fondateur.commande_minimum) * 2,
                    'usage_max': 200,
                    'actif': True,
                }
            )
        self.stdout.write(f'  [OK] Codes promo crees')

    def _creer_transporteurs(self):
        transporteurs = []
        for data in TRANSPORTEURS_DATA:
            user, _ = CustomUser.objects.get_or_create(
                username=data['username'],
                defaults={
                    'email': f'{data["username"]}@delivermap.ma',
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'TRANSPORTEUR',
                    'phone': data['phone'],
                    'location': Point(data['lon'], data['lat'], srid=4326),
                }
            )
            user.set_password('driver2025')
            user.save()

            t, _ = Transporteur.objects.get_or_create(
                user=user,
                defaults={
                    'vehicule_type': data['vehicule'],
                    'plaque': data['plaque'],
                    'capacite_kg': data['capacite'],
                    'is_verified': True,
                    'is_available': random.choice([True, True, True, False]),
                    'position_actuelle': Point(data['lon'], data['lat'], srid=4326),
                    'derniere_maj_position': timezone.now() - timedelta(minutes=random.randint(1, 45)),
                    'note_moyenne': round(random.uniform(3.8, 5.0), 1),
                    'nombre_avis': random.randint(10, 150),
                    'nombre_livraisons': random.randint(10, 500),
                    'revenus_total': random.uniform(500, 25000),
                }
            )
            transporteurs.append(t)
        self.stdout.write(f'  [OK] {len(transporteurs)} transporteurs crees')
        return transporteurs

    def _creer_commandes(self, clients, boutiques, transporteurs):
        commandes = []
        statuts_distribution = [
            'LIVREE', 'LIVREE', 'LIVREE', 'LIVREE', 'LIVREE', 'LIVREE',
            'EN_ROUTE', 'EN_ROUTE',
            'EN_PREPARATION', 'EN_PREPARATION',
            'VALIDEE', 'VALIDEE',
            'EN_ATTENTE', 'EN_ATTENTE', 'EN_ATTENTE',
            'ANNULEE',
        ]

        nb_commandes = 100

        for i in range(nb_commandes):
            client = random.choice(clients)
            fondateur = random.choice(boutiques)
            statut = random.choice(statuts_distribution)
            adresse_info = random.choice(ADRESSES_LIVRAISON)
            adresse, lat, lon = adresse_info

            produits_dispo = list(Produit.objects.filter(fondateur=fondateur, disponible=True)[:8])
            if not produits_dispo:
                continue

            selected = random.sample(produits_dispo, min(random.randint(1, 4), len(produits_dispo)))
            qtities = [random.randint(1, 3) for _ in selected]
            sous_total = sum(float(p.prix_effectif) * q for p, q in zip(selected, qtities))
            frais = float(fondateur.frais_livraison_base)
            total = sous_total + frais

            jours_ago = random.randint(0, 60)
            created = timezone.now() - timedelta(days=jours_ago, hours=random.randint(0, 23))

            t_assignee = None
            if statut in ['EN_ROUTE', 'EN_PREPARATION', 'LIVREE']:
                t_assignee = random.choice(transporteurs)

            commande = Commande.objects.create(
                client=client,
                fondateur=fondateur,
                transporteur=t_assignee.user if t_assignee else None,
                adresse_livraison=adresse,
                location_livraison=Point(lon, lat, srid=4326),
                statut=statut,
                mode_paiement=random.choice(['CASH', 'CASH', 'CASH', 'CARTE']),
                est_paye=(statut == 'LIVREE'),
                sous_total=round(sous_total, 2),
                frais_livraison=frais,
                total_price=round(total, 2),
                livraison_immediate=True,
                created_at=created,
                livree_at=created + timedelta(hours=random.randint(1, 5)) if statut == 'LIVREE' else None,
            )
            Commande.objects.filter(pk=commande.pk).update(created_at=created)

            for produit, qte in zip(selected, qtities):
                CommandeProduit.objects.create(
                    commande=commande,
                    produit=produit,
                    quantite=qte,
                    prix_unitaire=produit.prix_effectif,
                )

            if statut in ['EN_ROUTE', 'LIVREE'] and t_assignee:
                try:
                    Livraison.objects.create(
                        commande=commande,
                        transporteur=t_assignee,
                        depart=fondateur.localisation,
                        arrivee=commande.client.localisation if commande.client and hasattr(commande.client, "localisation") else fondateur.localisation,
                    )
                except Exception:
                    pass

        self.stdout.write(self.style.SUCCESS("Seed completed successfully."))
