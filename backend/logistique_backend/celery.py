"""
Celery application configuration for DeliverMap.

Usage:
    celery -A logistique_backend worker -l info
    celery -A logistique_backend beat   -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'logistique_backend.settings')

app = Celery('logistique_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()
