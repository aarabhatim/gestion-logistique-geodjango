from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('commandes', '0001_initial'),
        ('contrats', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='contrat',
            name='commande',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='contrat_livraison',
                to='commandes.commande',
            ),
        ),
    ]
