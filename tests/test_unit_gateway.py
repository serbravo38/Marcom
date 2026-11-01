import sys
import os
import time
import pytest

from tests.module_loader import isolate_service
isolate_service("gateway")

from main import _is_rate_limited, _request_history, MAX_AUTH_REQUESTS_PER_WINDOW, MAX_REQUESTS_PER_WINDOW, ALLOWED_ORIGINS

def test_gateway_rate_limiting_auth():
    """Valida que el Gateway bloquee con Rate Limit al superar el umbral de autenticación (60 req/min)"""
    client_ip = "192.168.1.100"
    _request_history[client_ip].clear()
    
    for i in range(MAX_AUTH_REQUESTS_PER_WINDOW):
        limited = _is_rate_limited(client_ip, "api/v1/auth/iniciar-sesion")
        assert limited is False, f"Petición {i+1} no debió ser bloqueada"
        
    assert _is_rate_limited(client_ip, "api/v1/auth/iniciar-sesion") is True

def test_gateway_rate_limiting_general():
    """Valida que rutas generales admitan hasta 300 peticiones por minuto por IP"""
    client_ip = "192.168.1.101"
    _request_history[client_ip].clear()
    
    for _ in range(MAX_REQUESTS_PER_WINDOW - 1):
        _request_history[client_ip].append(time.time())
        
    assert _is_rate_limited(client_ip, "api/v1/productos") is False
    assert _is_rate_limited(client_ip, "api/v1/productos") is True

def test_gateway_rate_limiting_window_expiry():
    """Valida que tras expirar la ventana de 60 segundos, el contador se renueve"""
    client_ip = "192.168.1.102"
    _request_history[client_ip].clear()
    
    old_time = time.time() - 65
    _request_history[client_ip] = [old_time] * 100
    
    assert _is_rate_limited(client_ip, "api/v1/auth/iniciar-sesion") is False
    assert len(_request_history[client_ip]) == 1

def test_gateway_rate_limiting_ip_isolation():
    """Valida que el bloqueo por Rate Limit de una IP atacante no afecte a usuarios legítimos en otras IPs"""
    attacker_ip = "10.0.0.99"
    legitimate_ip = "10.0.0.50"
    _request_history[attacker_ip].clear()
    _request_history[legitimate_ip].clear()

    for _ in range(MAX_AUTH_REQUESTS_PER_WINDOW):
        _is_rate_limited(attacker_ip, "api/v1/auth/iniciar-sesion")

    assert _is_rate_limited(attacker_ip, "api/v1/auth/iniciar-sesion") is True
    assert _is_rate_limited(legitimate_ip, "api/v1/auth/iniciar-sesion") is False

def test_gateway_cors_origins_configured():
    """Valida que la lista de orígenes permitidos CORS esté definida y no contenga comodines inseguros abiertos"""
    assert isinstance(ALLOWED_ORIGINS, list)
    assert "*" not in ALLOWED_ORIGINS
