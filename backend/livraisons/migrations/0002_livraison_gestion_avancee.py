"""
Migration : gestion avancée des livraisons
- photo_preuve
- instructions_speciales
- report (est_reportee, report_motif, report_commentaire, date_report)
- livraison partielle (nb_colis_total, nb_colis_livres)
- notif_depart_envoyee
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('livraisons', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='livraison',
            name='photo_preuve',
            field=models.ImageField(
                blank=True, null=True,
                help_text='Photo prise à la livraison (porte, boite aux lettres...)',
                upload_to='livraisons/preuves/',
            ),
        ),
        migrations.AddField(
            model_name='livraison',
            name='instructions_speciales',
            field=models.TextField(
                blank=True,
                help_text='Instructions du client : code digicode, étage, animaux...',
            ),
        ),
        migrations.AddField(
            model_name='livraison',
            name='est_reportee',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='livraison',
            name='report_motif',
            field=models.CharField(
                blank=True, max_length=20,
                choices=[
                    ('CLIENT_ABSENT', 'Client absent'),
                    ('ACCES_BLOQUE', 'Accès bloqué'),
                    ('ADRESSE_INTROUVABLE', 'Adresse introuvable'),
                    ('METEO', 'Conditions météo'),
                    ('AUTRE', 'Autre'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='livraison',
            name='report_commentaire',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='livraison',
            name='date_report',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='livraison',
            name='nb_colis_total',
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='livraison',
            name='nb_colis_livres',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='livraison',
            name='notif_depart_envoyee',
            field=models.BooleanField(default=False),
        ),
    ]
