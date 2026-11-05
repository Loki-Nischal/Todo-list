import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.environ.get('DJANGO_DEBUG', '1') == '1'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'local-development-only-daylight-secret-key')
if not DEBUG and SECRET_KEY.startswith('local-development'):
    raise RuntimeError('Set DJANGO_SECRET_KEY before running with DEBUG disabled.')
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
# Next.js uses 3001 when another instance already occupies 3000.
# Deployment origins must be configured explicitly.
LOCAL_FRONTEND_ORIGINS = ','.join(
    f'http://{host}:{port}'
    for host in ('localhost', '127.0.0.1')
    for port in (3000, 3001)
)
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'DJANGO_CSRF_TRUSTED_ORIGINS', LOCAL_FRONTEND_ORIGINS if DEBUG else ''
    ).split(',')
    if origin.strip()
]
CSRF_FAILURE_VIEW = 'todos.views.csrf_failure'
INSTALLED_APPS = ['django.contrib.contenttypes', 'django.contrib.sessions', 'todos']
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
]
ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'UTC'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 60 * 60 * 24 * 365
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
