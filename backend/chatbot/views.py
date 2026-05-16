from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .llm import run_conversation
from .serializers import ChatRequestSerializer


class ChatbotView(APIView):
    """Assistant conversationnel client : recherche produits, suivi commande, panier."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.validated_data['message']
        history = serializer.validated_data.get('history', [])

        result = run_conversation(message, history, request.user)

        # Historique renvoyé au client (texte seulement, borné) pour le tour suivant
        nouvelle_history = (history + [
            {'role': 'user', 'content': message},
            {'role': 'assistant', 'content': result['reply']},
        ])[-20:]

        return Response({
            'reply': result['reply'],
            'products': result.get('products', []),
            'order': result.get('order'),
            'action': result.get('action'),
            'history': nouvelle_history,
        })
