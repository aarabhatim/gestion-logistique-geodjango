import logging
import traceback

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .llm import run_conversation
from .serializers import ChatRequestSerializer

logger = logging.getLogger(__name__)


SAFE_FALLBACK_REPLY = (
    "Je rencontre un souci technique pour le moment. Reessayez votre "
    "message dans un instant. Vous pouvez aussi me demander : "
    "'ou en est ma commande ?' ou rechercher un produit."
)


class ChatbotView(APIView):
    """Assistant conversationnel client : recherche produits, suivi commande, panier."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.validated_data['message']
        history = serializer.validated_data.get('history', [])

        try:
            result = run_conversation(message, history, request.user)
        except Exception as exc:
            logger.error("Chatbot crash: %s\n%s", exc, traceback.format_exc())
            result = {
                'reply': SAFE_FALLBACK_REPLY,
                'products': [],
                'order': None,
                'action': None,
            }

        reply_text = result.get('reply') or SAFE_FALLBACK_REPLY

        nouvelle_history = (history + [
            {'role': 'user', 'content': message},
            {'role': 'assistant', 'content': reply_text},
        ])[-20:]

        return Response({
            'reply': reply_text,
            'products': result.get('products') or [],
            'order': result.get('order'),
            'action': result.get('action'),
            'history': nouvelle_history,
        })
