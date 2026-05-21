"""
Tests: Auth endpoints — register, login, token refresh, profile.
"""
import pytest


@pytest.mark.django_db
class TestAuthentication:
    def test_register_new_user(self, api_client):
        res = api_client.post('/api/auth/register/', {
            'username':   'newuser',
            'email':      'newuser@test.com',
            'password':   'StrongPass123!',
            'password2':  'StrongPass123!',
            'first_name': 'New',
            'last_name':  'User',
            'role':       'CLIENT',
        }, format='json')
        assert res.status_code in (200, 201), res.data

    def test_login_returns_tokens(self, api_client, client_user):
        res = api_client.post('/api/auth/login/', {
            'username': client_user.username,
            'password': 'testpass123',
        }, format='json')
        assert res.status_code == 200
        assert 'access' in res.data
        assert 'refresh' in res.data

    def test_login_wrong_password(self, api_client, client_user):
        res = api_client.post('/api/auth/login/', {
            'username': client_user.username,
            'password': 'wrongpassword',
        }, format='json')
        assert res.status_code in (400, 401)

    def test_profile_requires_auth(self, api_client):
        res = api_client.get('/api/auth/me/')
        assert res.status_code == 401

    def test_authenticated_user_gets_profile(self, api_client, client_user):
        api_client.force_authenticate(user=client_user)
        res = api_client.get('/api/auth/me/')
        assert res.status_code == 200
        assert res.data['email'] == client_user.email


@pytest.mark.django_db
class TestTokenRefresh:
    def test_token_refresh(self, api_client, client_user):
        login_res = api_client.post('/api/auth/login/', {
            'username': client_user.username,
            'password': 'testpass123',
        }, format='json')
        assert login_res.status_code == 200
        refresh_token = login_res.data.get('refresh')
        assert refresh_token, "No refresh token in response"

        refresh_res = api_client.post('/api/auth/token/refresh/', {
            'refresh': refresh_token,
        }, format='json')
        assert refresh_res.status_code == 200
        assert 'access' in refresh_res.data
