import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# ============================================
# SECRET KEY — MUST be set in Render env vars
# ============================================
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "django-insecure-development-key"  # fallback ONLY for local use
)

# ============================================
# DEBUG
# ============================================
DEBUG = os.getenv("DEBUG", "False") == "True"

# ============================================
# ALLOWED_HOSTS
# ============================================
RENDER_EXTERNAL_HOSTNAME = os.getenv("RENDER_EXTERNAL_HOSTNAME")

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
]

if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Your backend Render URL
ALLOWED_HOSTS.append("motivatchi-backend.onrender.com")

# ============================================
# INSTALLED APPS
# ============================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'corsheaders',
    'rest_framework',

    # Local apps
    'tamagotchi',
    'users',
    'tasks',
]

# ============================================
# MIDDLEWARE
# ============================================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ============================================
# URL & WSGI
# ============================================
ROOT_URLCONF = 'motivatchi.urls'
WSGI_APPLICATION = 'motivatchi.wsgi.application'

# ============================================
# DATABASE — Render or local fallback
# ============================================
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True
        )
    }
else:
    # Local dev DB
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'motivatchi_db',
            'USER': 'motivatchi_db_user',
            'PASSWORD': 'AGblZK1ZYFj3N6t2m4VHTmc35F14RdS9',
            'HOST': 'dpg-d49q6omuk2gs739fseg0-a.ohio-postgres.render.com',
            'PORT': '5432',
        }
    }

# ============================================
# PASSWORD VALIDATION
# ============================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ============================================
# INTERNATIONALIZATION
# ============================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ============================================
# STATIC FILES (Render)
# ============================================
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ============================================
# CORS / CSRF CONFIG — FINAL PRODUCTION VERSION
# ============================================

FRONTEND_URL = "https://motivatchi.onrender.com"
BACKEND_URL = "https://motivatchi-backend.onrender.com"

CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    FRONTEND_URL,
    BACKEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ============================================
# COOKIES (Fix authentication issues)
# ============================================
SESSION_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True

CSRF_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SECURE = True

SESSION_COOKIE_NAME = "sessionid"

# ============================================
# REST FRAMEWORK
# ============================================
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

