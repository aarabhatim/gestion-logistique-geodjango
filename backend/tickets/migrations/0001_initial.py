import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('commandes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Ticket',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titre', models.CharField(max_length=300)),
                ('description', models.TextField()),
                ('categorie', models.CharField(choices=[('reclamation', "Réclamation"), ('assistance', "Demande d'assistance"), ('incident', 'Incident'), ('retard', 'Retard de livraison'), ('retour', 'Retour produit'), ('autre', 'Autre')], default='autre', max_length=20)),
                ('priorite', models.CharField(choices=[('faible', 'Faible'), ('moyen', 'Moyen'), ('urgent', 'Urgent')], default='moyen', max_length=10)),
                ('statut', models.CharField(choices=[('ouvert', 'Ouvert'), ('en_cours', 'En cours'), ('en_attente', "En attente de réponse"), ('resolu', 'Résolu'), ('ferme', 'Fermé')], default='ouvert', max_length=15)),
                ('sla_heures', models.IntegerField(default=24, help_text='Délai de résolution attendu en heures')),
                ('sla_depasse', models.BooleanField(default=False)),
                ('sla_alerte_envoyee', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('resolu_at', models.DateTimeField(blank=True, null=True)),
                ('auteur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tickets_crees', to=settings.AUTH_USER_MODEL)),
                ('assigne_a', models.ForeignKey(blank=True, limit_choices_to={'role': 'ADMIN'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tickets_assignes', to=settings.AUTH_USER_MODEL)),
                ('commande', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tickets', to='commandes.commande')),
            ],
            options={
                'verbose_name': 'Ticket',
                'verbose_name_plural': 'Tickets',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='ticket',
            index=models.Index(fields=['statut', 'priorite'], name='tickets_tic_statut_idx'),
        ),
        migrations.AddIndex(
            model_name='ticket',
            index=models.Index(fields=['auteur'], name='tickets_tic_auteur_idx'),
        ),
        migrations.CreateModel(
            name='TicketMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('contenu', models.TextField()),
                ('is_note_interne', models.BooleanField(default=False, help_text='Note visible uniquement par les admins')),
                ('piece_jointe', models.FileField(blank=True, null=True, upload_to='tickets/pieces_jointes/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ticket', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='tickets.ticket')),
                ('auteur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ticket_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Message ticket',
                'verbose_name_plural': 'Messages tickets',
                'ordering': ['created_at'],
            },
        ),
    ]
