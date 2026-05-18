import incidents.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('incidents', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='IncidentPhoto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to=incidents.models.incident_photo_path)),
                ('legende', models.CharField(blank=True, max_length=200)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('incident', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='photos',
                    to='incidents.incident',
                )),
            ],
            options={
                'verbose_name': 'Photo incident',
                'verbose_name_plural': 'Photos incidents',
                'ordering': ['uploaded_at'],
            },
        ),
    ]
