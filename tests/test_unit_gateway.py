import sys
import os
import time
import pytest

from tests.module_loader import isolate_service
isolate_service("gateway")

from main import _is_rate_limited, _request_history, MAX_AUTH_REQUESTS_PER_WINDOW, MAX_REQUESTS_PER_WINDOW

def test_gateway_rate_limiting_auth():
    """Valida que el Gateway bloquee con Rate Limit al superar el umbral de autenticación (60 req/min)"""
    client_ip = "192.168.1.100"
    _request_history[client_ip].clear()
    
    # 60 peticiones deben ser permitidas
    for i in range(MAX_AUTH_REQUESTS_PER_WINDOW):
        limited = _is_rate_limited(client_ip, "api/v1/auth/iniciar-sesion")
        assert limited is False, f"Petición {i+1} no debió ser bloqueada"
        
    # La petición 61 debe ser bloqueada por rate limit
    assert _is_rate_limited(client_ip, "api/v1/auth/iniciar-sesion") is True

def test_gateway_rate_limiting_general():
    """Valida que rutas generales admitan hasta 300 peticiones por minuto por IP"""
    client_ip = "192.168.1.101"
    _request_history[client_ip].clear()
    
    # Realizar 299 peticiones
    for _ in range(MAX_REQUESTS_PER_WINDOW - 1):
        _request_history[client_ip].append(time.time())
        
    # Petición 300 debe pasar
    assert _is_rate_limited(client_ip, "api/v1/productos") is False
    # Petición 301 debe ser bloqueada
    assert _is_rate_limited(client_ip, "api/v1/productos") is True

def test_gateway_rate_limiting_window_expiry():
    """Valida que tras expirar la ventana de 60 segundos, el contador se renueve"""
    client_ip = "192.168.1.102"
    _request_history[client_ip].clear()
    
    # Simular timestamps antiguos (hace 65 segundos)
    old_time = time.time() - 65
    _request_history[client_ip] = [old_time] * 100
    
    # Al evaluar ahora, las entradas viejas deben ser purgadas
    assert _is_rate_limited(client_ip, "api/v1/auth/iniciar-sesion") is False
    assert len(_request_history[client_ip]) == 1
