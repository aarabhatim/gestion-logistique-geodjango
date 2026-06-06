import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)

# --- Windows GDAL/GEOS fix ----------------------------------------------------
if os.name == 'nt':
    import glob
    # Chemins possibles ou GDAL peut etre installe (PostgreSQL ou OSGeo4W)
    _possible_dirs = [
        r'C:\Program Files\PostgreSQL\17\bin',
        r'C:\Program Files\PostgreSQL\16\bin',
        r'C:\Program Files\PostgreSQL\15\bin',
        r'C:\OSGeo4W\bin',
        r'C:\OSGeo4W64\bin',
    ]
    for _dir in _possible_dirs:
        if os.path.isdir(_dir):
            try:
                os.add_dll_directory(_dir)
            except Exception:
                pass
            # Detection automatique de la version de libgdal-XX.dll
            _gdal_dlls = glob.glob(os.path.join(_dir, 'libgdal-*.dll'))
            if not _gdal_dlls:
                _gdal_dlls = glob.glob(os.path.join(_dir, 'gdal*.dll'))
            _geos_dll = os.path.join(_dir, 'libgeos_c.dll')
            if _gdal_dlls and os.path.isfile(_geos_dll):
                GDAL_LIBRARY_PATH = _gdal_dlls[0]
                GEOS_LIBRARY_PATH = _geos_dll
                break

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

_secret = os.environ.get('SECRET_KEY')
if not _secret:
    if DEBUG:
        _secret = 'dev-only-secret-key-not-for-production'
    else:
        raise ValueError(
            "La variable d'environnement SECRET_KEY est obligatoire en production. "
            "Définissez-la dans backend/.env ou dans les variables d'environnement du serveur."
        )
SECRET_KEY = _secret

_allowed = os.environ.get('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()] if _allowed else (
    ['*'] if DEBUG else []
)

AUTH_USER_MODEL = 'accounts.CustomUser'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    # Third party
    'rest_framework',
    'rest_framework_gis',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'channels',
    # DeliverMap apps
    'accounts',
    'fondateurs',
    'commandes',
    'livraisons',
    'transporteurs',
    'notifications',
    'analytics',
    'incidents',
    'scoring',
    'tickets',
    'contrats',
    'clients',
    'tracking',
    'chatbot',
    'zones',
    'promotions',
    'bannieres',
    'blacklist',
    # Nouvelles fonctionnalités
    'favoris',
    'fidelite',
    'mode_groupe',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'logistique_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'logistique_backend.wsgi.application'
ASGI_APPLICATION = 'logistique_backend.asgi.application'

# --- Database PostgreSQL + PostGIS -------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'logistique_db'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASS', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# --- Cache (utilisé pour les tokens de réinitialisation de mot de passe) -----
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379'),
    }
}
# Fallback en mémoire si Redis indisponible (dev sans Redis)
try:
    import redis as _redis_test
    _redis_test.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379')).ping()
except Exception:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

# --- Channels / Redis --------------------------------------------------------
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# Fallback en mémoire si Redis indisponible (dev uniquement)
try:
    import channels_redis  # noqa: F401
except ImportError:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# --- Celery ------------------------------------------------------------------
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TIMEZONE = 'Africa/Casablanca'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# Periodic tasks (used with celery beat)
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    # Daily at 08:00 -- expire contrats
    'verifier-expirations-contrats': {
        'task': 'tasks.verifier_expirations_contrats',
        'schedule': crontab(hour=8, minute=0),
    },
    # Every 15 minutes -- retard livraisons
    'alertes-retard-livraisons': {
        'task': 'tasks.alertes_retard_livraisons',
        'schedule': crontab(minute='*/15'),
    },
    # Every Sunday at 03:00 -- clean old notifications
    'nettoyer-notifications': {
        'task': 'tasks.nettoyer_notifications',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),
    },
    # Every 30 minutes -- SLA ticket alerts
    'alertes-sla-tickets': {
        'task': 'tasks.alertes_sla_tickets',
        'schedule': crontab(minute='*/30'),
    },
}

# --- Django REST Framework ----------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    # Rate limiting — protège login, chatbot, tickets
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '300/minute',
        'login': '10/minute',
        'token_refresh': '20/minute',
        'chatbot': '30/minute',
        'ticket_create': '20/hour',
    },
}

# --- JWT ---------------------------------------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_OBTAIN_SERIALIZER': 'accounts.serializers.DeliverMapTokenObtainSerializer',
}

# --- CORS --------------------------------------------------------------------
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if _cors_origins:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
    ]
# En développement, autoriser toutes les origines par défaut ; forcer False en production
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'True' if DEBUG else 'False') == 'True'
CORS_ALLOW_CREDENTIALS = True

# --- Stripe ------------------------------------------------------------------
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# --- Email -------------------------------------------------------------------
# --- Email -------------------------------------------------------------------
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend'  # dev default
)
EMAIL_HOST          = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT          = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS       = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER     = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL', 'DeliverMap <noreply@delivermap.ma>')
SERVER_EMAIL        = DEFAULT_FROM_EMAIL

# --- Commission plateforme (%) ------------------------------------------------
PLATFORM_COMMISSION_RATE = float(os.environ.get('COMMISSION_RATE', '0.15'))

# --- OSRM routing server -----------------------------------------------------
OSRM_BASE_URL = os.environ.get('OSRM_BASE_URL', 'http://router.project-osrm.org')

# --- Auth validators ---------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Casablanca'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
