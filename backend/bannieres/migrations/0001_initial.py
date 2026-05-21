from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Banniere',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titre', models.CharField(max_length=150)),
                ('message', models.TextField()),
                ('type', models.CharField(
                    choices=[
                        ('info', 'Information'),
                        ('warning', 'Avertissement'),
                        ('danger', 'Danger / Maintenance'),
                        ('success', 'Succes'),
                    ],
                    default='info',
                    max_length=10,
                )),
                ('role_cible', models.CharField(
                    choices=[
                        ('all', 'Tous les utilisateurs'),
                        ('ADMIN', 'Admins'),
                        ('FONDATEUR', 'Fondateurs'),
                        ('TRANSPORTEUR', 'Transporteurs'),
                        ('CLIENT', 'Clients'),
                    ],
                    default='all',
                    max_length=20,
                )),
                ('actif', models.BooleanField(default=True)),
                ('date_debut', models.DateTimeField(default=django.utils.timezone.now)),
                ('date_fin', models.DateTimeField(blank=True, null=True)),
                ('dismissible', models.BooleanField(default=True)),
                ('lien_url', models.URLField(blank=True)),
                ('lien_texte', models.CharField(blank=True, max_length=60)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Banniere',
                'verbose_name_plural': 'Bannieres',
                'ordering': ['-created_at'],
            },
        ),
    ]
