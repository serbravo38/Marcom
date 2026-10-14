@echo off
chcp 65001 > nul
title MARCOM QA - Suite de Pruebas de Calidad
echo =============================================================================
echo   MARCOM - EJECUTOR DE PRUEBAS DE CALIDAD (QA MASTER SUITE)
echo =============================================================================
echo.
echo Ejecutando la suite de pruebas unitarias y generando reporte visual...
echo.

if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe run_qa_suite.py
) else (
    python run_qa_suite.py
)

echo.
echo =============================================================================
echo Presiona cualquier tecla para cerrar esta ventana...
echo =============================================================================
pause > nul
