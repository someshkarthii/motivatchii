from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY")

DEBUG = True


# Application definition
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

ROOT_URLCONF = 'motivatchi.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'motivatchi.wsgi.application'


# Database
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


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = '/static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'



# ✅ CORS / CSRF configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://backend-purple-field-5089.fly.dev",
    "https://motivatchi.fly.dev",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://backend-purple-field-5089.fly.dev",
    "https://motivatchi.fly.dev",
]

CORS_ALLOW_CREDENTIALS = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "backend-purple-field-5089.fly.dev",
    "motivatchi.fly.dev",
    ".fly.dev",
]


#Cookie configuration for session persistence across frontend/backend
SESSION_COOKIE_SAMESITE = "None"       # allow cookies cross-site
SESSION_COOKIE_SECURE = True        # only True for HTTPS
CSRF_COOKIE_SAMESITE = "None"          # allow CSRF cookie cross-site
CSRF_COOKIE_SECURE = True           # only True for HTTPS

# Explicitly name session cookie (helps debugging)
SESSION_COOKIE_NAME = "sessionid"


# REST Framework settings
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
}

