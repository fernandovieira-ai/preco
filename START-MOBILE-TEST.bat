@echo off
REM Script para iniciar o app para testes no celular
REM Data: 25/02/2026

echo ========================================
echo  TrocaPreco - Modo Mobile Test
echo ========================================
echo.

REM Obter IP da máquina
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

echo [INFO] IP da sua maquina: %IP%
echo.
echo ========================================
echo  INSTRUCOES PARA TESTAR NO CELULAR
echo ========================================
echo.
echo 1. Certifique-se que o celular esta na MESMA REDE Wi-Fi
echo 2. Inicie o BACKEND em outro terminal com:
echo    cd backend
echo    npm start
echo.
echo 3. No celular, acesse o navegador e digite:
echo    http://%IP%:4200
echo.
echo ========================================
echo.

echo [INFO] Iniciando Angular em modo network...
echo.

npm run start:network
