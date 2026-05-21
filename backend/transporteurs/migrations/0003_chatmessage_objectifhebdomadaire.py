from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('transporteurs', '0002_transporteur_date_derniere_session_and_more'),
        ('commandes', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('contenu', models.TextField()),
                ('lu', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('commande', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='chat_messages',
                    to='commandes.commande',
                )),
                ('auteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='chat_messages_sent',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='ObjectifHebdomadaire',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('semaine', models.DateField(help_text='Lundi de la semaine cible')),
                ('objectif_livraisons', models.PositiveIntegerField(default=10)),
                ('livraisons_effectuees', models.PositiveIntegerField(default=0)),
                ('objectif_note', models.DecimalField(decimal_places=1, default=4.0, max_digits=3)),
                ('note_obtenue', models.DecimalField(decimal_places=1, default=0, max_digits=3)),
                ('bonus_obtenu', models.BooleanField(default=False)),
                ('badge', models.CharField(blank=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('transporteur', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='objectifs',
                    to='transporteurs.transporteur',
                )),
            ],
            options={
                'ordering': ['-semaine'],
                'unique_together': {('transporteur', 'semaine')},
            },
        ),
    ]
