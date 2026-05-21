from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('fondateurs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CampagnePromo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=150)),
                ('description', models.TextField(blank=True)),
                ('type_reduction', models.CharField(
                    choices=[
                        ('pourcentage', 'Pourcentage'),
                        ('montant_fixe', 'Montant fixe'),
                        ('livraison_gratuite', 'Livraison gratuite'),
                    ],
                    default='pourcentage',
                    max_length=20,
                )),
                ('valeur', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('code', models.CharField(max_length=30, unique=True)),
                ('date_debut', models.DateTimeField(default=django.utils.timezone.now)),
                ('date_fin', models.DateTimeField(blank=True, null=True)),
                ('usage_max', models.PositiveIntegerField(blank=True, help_text='Laisser vide = illimite', null=True)),
                ('usage_count', models.PositiveIntegerField(default=0)),
                ('montant_min_commande', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('actif', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('fondateurs', models.ManyToManyField(blank=True, related_name='campagnes_promo', to='fondateurs.fondateur')),
            ],
            options={
                'verbose_name': 'Campagne promo',
                'verbose_name_plural': 'Campagnes promo',
                'ordering': ['-created_at'],
            },
        ),
    ]
