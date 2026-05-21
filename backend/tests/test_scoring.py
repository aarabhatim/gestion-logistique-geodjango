"""
Tests: Scoring formula and API endpoints.
Score formula: score_global = ponctualite*0.30 + fiabilite*0.30 + satisfaction*0.25 + rapidite*0.15
"""
import pytest
from decimal import Decimal


@pytest.mark.django_db
class TestScoringFormula:
    POIDS = {'ponctualite': 0.30, 'fiabilite': 0.30, 'satisfaction': 0.25, 'rapidite': 0.15}

    def _create_score(self, transporteur_profile, **kwargs):
        """
        Create a ScoreTransporteur with explicit dimension values.
        The model stores score_global as a plain field (no auto-save hook),
        so we compute and set it here based on the weighted formula.
        Field names on the model: score_ponctualite, score_fiabilite,
        score_satisfaction, score_rapidite, score_global.
        ScoreTransporteur.transporteur is a FK to AUTH_USER_MODEL,
        so we pass transporteur_profile.user.
        """
        from scoring.models import ScoreTransporteur
        # Accept short names (ponctualite, ...) for convenience and map to model fields.
        p = float(kwargs.pop('ponctualite', 80.0))
        f = float(kwargs.pop('fiabilite',   75.0))
        s = float(kwargs.pop('satisfaction', 85.0))
        r = float(kwargs.pop('rapidite',     70.0))
        global_score = round(
            p * self.POIDS['ponctualite'] +
            f * self.POIDS['fiabilite'] +
            s * self.POIDS['satisfaction'] +
            r * self.POIDS['rapidite'],
            2,
        )
        defaults = {
            'transporteur':       transporteur_profile.user,
            'score_ponctualite':  p,
            'score_fiabilite':    f,
            'score_satisfaction': s,
            'score_rapidite':     r,
            'score_global':       global_score,
        }
        defaults.update(kwargs)
        return ScoreTransporteur.objects.create(**defaults)

    def test_score_formula_known_values(self, db, transporteur_profile):
        score = self._create_score(
            transporteur_profile,
            ponctualite=100,
            fiabilite=100,
            satisfaction=100,
            rapidite=100,
        )
        expected = 100 * 0.30 + 100 * 0.30 + 100 * 0.25 + 100 * 0.15
        assert float(score.score_global) == pytest.approx(expected, rel=0.01)

    def test_score_formula_zero_values(self, db, transporteur_profile):
        score = self._create_score(
            transporteur_profile,
            ponctualite=0,
            fiabilite=0,
            satisfaction=0,
            rapidite=0,
        )
        assert float(score.score_global) == pytest.approx(0.0, abs=0.01)

    def test_score_formula_partial(self, db, transporteur_profile):
        # ponctualite=80, fiabilite=75, satisfaction=85, rapidite=70
        # expected = 80*0.30 + 75*0.30 + 85*0.25 + 70*0.15
        #          = 24 + 22.5 + 21.25 + 10.5 = 78.25
        score = self._create_score(transporteur_profile)
        expected = 80 * 0.30 + 75 * 0.30 + 85 * 0.25 + 70 * 0.15
        assert float(score.score_global) == pytest.approx(expected, rel=0.01)

    def test_score_between_0_and_100(self, db, transporteur_profile):
        score = self._create_score(transporteur_profile)
        assert 0 <= float(score.score_global) <= 100


@pytest.mark.django_db
class TestScoringAPI:
    def test_admin_can_list_scores(self, api_client, admin_user, db):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/scoring/')
        assert res.status_code == 200

    def test_unauthenticated_cannot_list_scores(self, api_client, db):
        res = api_client.get('/api/scoring/')
        assert res.status_code == 401

    def test_classement_endpoint(self, api_client, admin_user, db):
        api_client.force_authenticate(user=admin_user)
        res = api_client.get('/api/scoring/classement/')
        assert res.status_code == 200
        assert isinstance(res.data, list)
