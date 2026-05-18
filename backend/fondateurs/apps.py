from django.apps import AppConfig


class FondateursConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fondateurs'
    verbose_name = 'Fondateurs & Boutiques'

    def ready(self):
        import fondateurs.signals  # noqa
