"""
Migration : nouvelles fonctionnalités v2
- ChatMessage : champs position GPS + est_position_partagee
- MessageTemplate : templates messages rapides
- Badge, BadgeTransporteur, NiveauTransporteur : gamification
- DisponibiliteHebdo, AbsenceTransporteur, PreferenceZone : planning
- EntretienVehicule, DocumentVehicule : gestion véhicule
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('transporteurs', '0003_chatmessage_objectifhebdomadaire'),
        ('zones', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── ChatMessage : ajout champs position ────────────────────────────
        migrations.AddField(
            model_name='chatmessage',
            name='position_lat',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='position_lng',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='est_position_partagee',
            field=models.BooleanField(default=False),
        ),

        # ── MessageTemplate ────────────────────────────────────────────────
        migrations.CreateModel(
            name='MessageTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('contenu', models.CharField(max_length=200)),
                ('cible', models.CharField(
                    choices=[('CHAUFFEUR', 'Chauffeur'), ('CLIENT', 'Client'), ('TOUS', 'Tous')],
                    default='CHAUFFEUR', max_length=10,
                )),
                ('ordre', models.PositiveSmallIntegerField(default=0)),
                ('actif', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Template message rapide',
                'ordering': ['ordre', 'contenu'],
            },
        ),

        # ── Badge ──────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Badge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('nom', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('icone', models.CharField(default='🏅', help_text='Emoji représentant le badge', max_length=10)),
                ('categorie', models.CharField(
                    choices=[
                        ('LIVRAISONS', 'Volume de livraisons'),
                        ('PONCTUALITE', 'Ponctualité'),
                        ('SATISFACTION', 'Satisfaction client'),
                        ('SECURITE', 'Sécurité (zéro incident)'),
                        ('FIDELITE', 'Fidélité plateforme'),
                        ('SPECIAL', 'Badge spécial'),
                    ],
                    default='LIVRAISONS', max_length=15,
                )),
                ('seuil', models.PositiveIntegerField(default=0, help_text='Valeur numérique pour débloquer')),
                ('actif', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Badge',
                'ordering': ['categorie', 'seuil'],
            },
        ),

        # ── BadgeTransporteur ──────────────────────────────────────────────
        migrations.CreateModel(
            name='BadgeTransporteur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('obtenu_le', models.DateTimeField(auto_now_add=True)),
                ('notifie', models.BooleanField(default=False)),
                ('badge', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='detenteurs',
                    to='transporteurs.badge',
                )),
                ('transporteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='badges',
                    to='transporteurs.transporteur',
                )),
            ],
            options={
                'ordering': ['-obtenu_le'],
                'unique_together': {('transporteur', 'badge')},
            },
        ),

        # ── NiveauTransporteur ─────────────────────────────────────────────
        migrations.CreateModel(
            name='NiveauTransporteur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('niveau', models.CharField(
                    choices=[
                        ('BRONZE', 'Bronze'), ('ARGENT', 'Argent'),
                        ('OR', 'Or'), ('PLATINE', 'Platine'),
                    ],
                    default='BRONZE', max_length=10,
                )),
                ('points', models.PositiveIntegerField(default=0)),
                ('mise_a_jour', models.DateTimeField(auto_now=True)),
                ('transporteur', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='niveau',
                    to='transporteurs.transporteur',
                )),
            ],
        ),

        # ── DisponibiliteHebdo ─────────────────────────────────────────────
        migrations.CreateModel(
            name='DisponibiliteHebdo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('jour_semaine', models.PositiveSmallIntegerField(
                    choices=[(0,'Lundi'),(1,'Mardi'),(2,'Mercredi'),
                             (3,'Jeudi'),(4,'Vendredi'),(5,'Samedi'),(6,'Dimanche')],
                )),
                ('heure_debut', models.TimeField()),
                ('heure_fin', models.TimeField()),
                ('actif', models.BooleanField(default=True)),
                ('transporteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='disponibilites_hebdo',
                    to='transporteurs.transporteur',
                )),
            ],
            options={
                'verbose_name': 'Créneau disponibilité',
                'ordering': ['jour_semaine', 'heure_debut'],
                'unique_together': {('transporteur', 'jour_semaine', 'heure_debut')},
            },
        ),

        # ── AbsenceTransporteur ────────────────────────────────────────────
        migrations.CreateModel(
            name='AbsenceTransporteur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_debut', models.DateField()),
                ('date_fin', models.DateField()),
                ('motif', models.CharField(max_length=200)),
                ('statut', models.CharField(
                    choices=[('EN_ATTENTE','En attente'),('APPROUVEE','Approuvée'),('REFUSEE','Refusée')],
                    default='EN_ATTENTE', max_length=12,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('transporteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='absences',
                    to='transporteurs.transporteur',
                )),
                ('valide_par', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='absences_validees',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Absence transporteur',
                'ordering': ['-date_debut'],
            },
        ),

        # ── PreferenceZone ─────────────────────────────────────────────────
        migrations.CreateModel(
            name='PreferenceZone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('limite_commandes_jour', models.PositiveSmallIntegerField(default=0, help_text='0 = pas de limite')),
                ('transporteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='zones_preferees',
                    to='transporteurs.transporteur',
                )),
                ('zone', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='transporteurs_preferents',
                    to='zones.ZoneLivraison',
                )),
            ],
            options={
                'verbose_name': 'Préférence de zone',
                'unique_together': {('transporteur', 'zone')},
            },
        ),

        # ── EntretienVehicule ──────────────────────────────────────────────
        migrations.CreateModel(
            name='EntretienVehicule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_entretien', models.CharField(
                    choices=[
                        ('VIDANGE','Vidange'),('PNEUS','Changement pneus'),
                        ('FREINS','Freins'),('REVISION','Révision générale'),
                        ('CONTROLE_TECHNIQUE','Contrôle technique'),
                        ('REPARATION','Réparation'),('AUTRE','Autre'),
                    ],
                    max_length=20,
                )),
                ('date_entretien', models.DateField()),
                ('kilometrage', models.PositiveIntegerField(help_text="Kilométrage au moment de l'entretien")),
                ('cout', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('description', models.TextField(blank=True)),
                ('prochain_entretien_km', models.PositiveIntegerField(
                    blank=True, null=True,
                    help_text='Kilométrage prévu pour le prochain entretien',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('transporteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='entretiens',
                    to='transporteurs.transporteur',
                )),
            ],
            options={
                'verbose_name': 'Entretien véhicule',
                'ordering': ['-date_entretien'],
            },
        ),

        # ── DocumentVehicule ───────────────────────────────────────────────
        migrations.CreateModel(
            name='DocumentVehicule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_document', models.CharField(
                    choices=[
                        ('ASSURANCE','Assurance'),('CARTE_GRISE','Carte grise'),
                        ('VIGNETTE','Vignette'),('VISITE_TECHNIQUE','Visite technique'),
                        ('AUTRE','Autre'),
                    ],
                    max_length=20,
                )),
                ('fichier', models.FileField(upload_to='transporteurs/documents/')),
                ('date_expiration', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('transporteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='documents_vehicule',
                    to='transporteurs.transporteur',
                )),
            ],
            options={
                'verbose_name': 'Document véhicule',
                'ordering': ['-created_at'],
            },
        ),
    ]
