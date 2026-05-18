import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fondateurs', '0001_initial'),
        ('commandes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Contrat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titre', models.CharField(max_length=300)),
                ('type_service', models.CharField(choices=[('standard', 'Livraison standard'), ('express', 'Livraison express'), ('recurrente', 'Livraison récurrente'), ('bulk', 'Livraison en volume')], default='standard', max_length=20)),
                ('tarif_negocie', models.DecimalField(decimal_places=2, max_digits=10)),
                ('description_termes', models.TextField(blank=True)),
                ('date_debut', models.DateField()),
                ('date_fin', models.DateField()),
                ('statut', models.CharField(choices=[('brouillon', 'Brouillon'), ('envoye', 'Envoyé pour signature'), ('signe', 'Signé'), ('actif', 'Actif'), ('expire', 'Expiré'), ('resilie', 'Résilié')], default='brouillon', max_length=15)),
                ('fichier_pdf', models.FileField(blank=True, null=True, upload_to='contrats/pdf/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('signe_at', models.DateTimeField(blank=True, null=True)),
                ('boutique', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='contrats', to='fondateurs.fondateur')),
                ('client', models.ForeignKey(blank=True, limit_choices_to={'role': 'CLIENT'}, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='contrats_client', to=settings.AUTH_USER_MODEL)),
                ('transporteur', models.ForeignKey(blank=True, limit_choices_to={'role': 'TRANSPORTEUR'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='contrats_transporteur', to=settings.AUTH_USER_MODEL)),
                ('cree_par', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='contrats_crees', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Contrat',
                'verbose_name_plural': 'Contrats',
                'ordering': ['-created_at'],
            },
        ),
    ]
