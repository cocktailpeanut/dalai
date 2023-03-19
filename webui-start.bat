@ECHO OFF

for /f "tokens=2" %%A in ('mode con ^| find "Columns"') do set "WINDOW_WIDTH=%%A"
SET /a PRESPACE=%WINDOW_WIDTH%/2-26
SET "SPACE= "
FOR /l %%i IN (2,1,%PRESPACE%) DO CALL set "SPACE=%%SPACE%%%SPACE%"
ECHO %SPACE% >NUL

ECHO %SPACE%[0m
ECHO %SPACE%[46m[97m  _______       ___       __          ___       __  [0m
ECHO %SPACE%[46m[97m ^|       \     /   \     ^|  ^|        /   \     ^|  ^| [0m
ECHO %SPACE%[46m[97m ^|  .--.  ^|   /     \    ^|  ^|       /     \    ^|  ^| [0m
ECHO %SPACE%[46m[97m ^|  ^|  ^|  ^|  /  /_\  \   ^|  ^|      /  /_\  \   ^|  ^| [0m
ECHO %SPACE%[46m[97m ^|  '--'  ^| /  _____  \  ^|  `----./  _____  \  ^|  ^| [0m
ECHO %SPACE%[46m[97m ^|_______/ /__/     \__\ ^|_______/__/     \__\ ^|__^| [0m
ECHO %SPACE%[46m[97m.                                                  .[0m
ECHO %SPACE%[46m[97m              Web UI made by [93mItsPi3141[46m[97m              [0m
ECHO %SPACE%[46m[97m.                                                  .[0m

ECHO.
for /f "tokens=2" %%A in ('mode con ^| find "Columns"') do set "WINDOW_WIDTH=%%A"
SET LINE=-
FOR /l %%i IN (2,1,%WINDOW_WIDTH%) DO CALL set "LINE=%%LINE%%%LINE%"
ECHO %LINE%
ECHO.

SET DALAIPATH=%USERPROFILE%\dalai
DIR installpath.json >NUL
IF %ERRORLEVEL%==0 GOTO SERVE
ECHO Creating config file...
SET CONFIGFILE=installpath.json
SETLOCAL enabledelayedexpansion
SET "DALAIPATHESCAPED=!DALAIPATH:\=\\!"
ECHO ^{> %CONFIGFILE%
ECHO   "home": "%DALAIPATHESCAPED%">> %CONFIGFILE%
ECHO ^}>> %CONFIGFILE%

:SERVE
START /B CMD /C START http://localhost:42069
node bin/cli.js serve 42069