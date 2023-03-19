@ECHO off >NUL

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
ECHO %SPACE%[46m[97m            Installer made by [93mItsPi3141[97m[46m             [0m
ECHO %SPACE%[46m[97m.                                                  .[0m

ECHO.
for /f "tokens=2" %%A in ('mode con ^| find "Columns"') do set "WINDOW_WIDTH=%%A"
SET LINE=-
FOR /l %%i IN (2,1,%WINDOW_WIDTH%) DO CALL set "LINE=%%LINE%%%LINE%"
ECHO %LINE%
ECHO.

%SYSTEMDRIVE%
CD %USERPROFILE%

:INSTALL_VS
ECHO Preparing to install [95mVisual Studio 2019[0m with the following features:
ECHO   - Core editor
ECHO   - C++ build tools
ECHO   - Node.js
ECHO   - Python
@REM Download VS Community installer from https://aka.ms/vs/17/release/vs_community.exe
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://aka.ms/vs/16/release/vs_community.exe', 'vs_community.exe')"
ECHO.
ECHO Installing [95mVisual Studio 2019[0m...
ECHO [93mThis will take a long time[0m
ECHO Please be patient
ECHO Do not close the window
vs_community.exe ^
	--wait ^
	--passive ^
	--productId Microsoft.VisualStudio.Product.Community ^
	--channelURI https://aka.ms/vs/16/release/channel ^
	--norestart ^
	--add Microsoft.VisualStudio.Workload.NativeDesktop ^
	--add Microsoft.VisualStudio.Workload.Node ^
	--add Microsoft.VisualStudio.Workload.Python ^
	--installWhileDownloading

SET ERR_CODE=%ERRORLEVEL%
ECHO.
IF %ERR_CODE% == 0 (
	ECHO [92mVisual Studio 2019 was [1minstalled[0m
	goto DOWNLOAD_PROJ
)
IF NOT %ERR_CODE% == 0 (
	IF %ERR_CODE% == 1602 (
		ECHO [31mVisual Studio 2019 installer [1mrequires admin permission[0m
		goto END
	)
	IF %ERR_CODE% NEQ 1602 (
		ECHO [31mVisual Studio 2019 installation [1mfailed[0m
		goto END
	)
)

:END
ECHO [96mPress any key to exit...[0m
pause >nul