from django.db import migrations, models
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('transporteurs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ZoneLivraison',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True)),
                ('polygone', django.contrib.gis.db.models.fields.PolygonField(blank=True, geography=True, null=True, srid=4326)),
                ('tarif_base', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('tarif_km_supplementaire', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('actif', models.BooleanField(default=True)),
                ('couleur', models.CharField(default='#3b82f6', help_text='Couleur hex pour la carte', max_length=7)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('transporteurs', models.ManyToManyField(blank=True, related_name='zones', to='transporteurs.transporteur')),
            ],
            options={
                'verbose_name': 'Zone de livraison',
                'verbose_name_plural': 'Zones de livraison',
                'ordering': ['nom'],
            },
        ),
    ]
