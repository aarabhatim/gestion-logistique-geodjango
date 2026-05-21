from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AdresseBlacklist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('adresse', models.CharField(max_length=300)),
                ('ville', models.CharField(blank=True, max_length=100)),
                ('raison', models.CharField(
                    choices=[
                        ('fraude', 'Fraude / Arnaque'),
                        ('inaccessible', 'Adresse inaccessible'),
                        ('client_abusif', 'Client abusif'),
                        ('zone_dangereuse', 'Zone dangereuse'),
                        ('autre', 'Autre'),
                    ],
                    default='autre',
                    max_length=20,
                )),
                ('description', models.TextField(blank=True)),
                ('actif', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ajoutee_par', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='blacklists',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Adresse blacklistee',
                'verbose_name_plural': 'Adresses blacklistees',
                'ordering': ['-created_at'],
            },
        ),
    ]
