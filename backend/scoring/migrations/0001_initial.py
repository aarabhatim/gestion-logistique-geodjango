import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ScoreTransporteur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score_ponctualite', models.FloatField(default=0.0, help_text='% de livraisons dans les délais estimés')),
                ('score_fiabilite', models.FloatField(default=0.0, help_text='100 − (incidents / livraisons * 100)')),
                ('score_satisfaction', models.FloatField(default=0.0, help_text='Note moyenne clients ramenée sur 100')),
                ('score_rapidite', models.FloatField(default=0.0, help_text='Inverse du temps moyen de livraison normalisé')),
                ('score_global', models.FloatField(default=0.0, help_text='Moyenne pondérée des 4 dimensions')),
                ('nb_livraisons_total', models.IntegerField(default=0)),
                ('nb_livraisons_a_temps', models.IntegerField(default=0)),
                ('nb_incidents', models.IntegerField(default=0)),
                ('note_moyenne_clients', models.FloatField(default=0.0)),
                ('temps_moyen_livraison_min', models.FloatField(default=0.0, help_text='Temps moyen de livraison en minutes')),
                ('derniere_mise_a_jour', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('transporteur', models.OneToOneField(
                    limit_choices_to={'role': 'TRANSPORTEUR'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='score',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Score transporteur',
                'verbose_name_plural': 'Scores transporteurs',
                'ordering': ['-score_global'],
            },
        ),
    ]
