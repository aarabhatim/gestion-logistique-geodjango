"""Middleware Channels : authentification WebSocket par JWT."""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode, InvalidTokenError
from django.conf import settings


@database_sync_to_async
def _get_user(user_id):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        return User.objects.get(pk=user_id, is_active=True)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Authentifie un WebSocket via ?token=... dans la query string.

    Usage frontend :
        new WebSocket('ws://localhost:8000/ws/notifications/?token=ACCESS_TOKEN')
    """

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope['user'] = AnonymousUser()

        # Récupère le token depuis la query string
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = (params.get('token') or [None])[0]

        if token:
            try:
                # Valide la signature et la date d'expiration
                UntypedToken(token)
                decoded = jwt_decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=['HS256'],
                )
                user_id = decoded.get('user_id')
                if user_id:
                    scope['user'] = await _get_user(user_id)
            except (InvalidToken, TokenError, InvalidTokenError):
                pass

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Wrapper similaire à AuthMiddlewareStack mais JWT."""
    return JWTAuthMiddleware(inner)
