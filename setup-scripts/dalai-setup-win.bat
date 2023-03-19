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

ECHO.
for /f "tokens=2" %%A in ('mode con ^| find "Columns"') do set "WINDOW_WIDTH=%%A"
SET LINE=-
FOR /l %%i IN (2,1,%WINDOW_WIDTH%) DO CALL set "LINE=%%LINE%%%LINE%"
ECHO %LINE%
ECHO.

:DOWNLOAD_PROJ
DIR %CD%\dalai_pi >nul
IF %ERRORLEVEL%==1 GOTO CONTINUE_GH
choice /C YN /N /M "Folder %CD%\dalai_pi already exists, do you want to remove it and download it again from GitHub [Y,N]? "
IF %ERRORLEVEL%==2 GOTO SETUP_DALAI
RMDIR /Q /S dalai_pi >NUL

:CONTINUE_GH
ECHO Downloading Dalai from [94m[4mhttps://github.com/ItsPi3141/dalai[0m
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://github.com/ItsPi3141/dalai/archive/refs/heads/main.zip', 'dalai_pi.zip')"
ECHO Extracting files into %CD%\dalai_pi
tar -xf dalai_pi.zip dalai-main
ren dalai-main dalai_pi


:SETUP_DALAI

ECHO.
for /f "tokens=2" %%A in ('mode con ^| find "Columns"') do set "WINDOW_WIDTH=%%A"
SET LINE=-
FOR /l %%i IN (2,1,%WINDOW_WIDTH%) DO CALL set "LINE=%%LINE%%%LINE%"
ECHO %LINE%
ECHO.

ECHO Set Dalai folder path
ECHO Leave empty to use default location
SET DALAIPATH=%USERPROFILE%\dalai
set /p "DALAIPATH=Enter a filepath (%USERPROFILE%\dalai): "
DIR %DALAIPATH% >nul
IF %ERRORLEVEL%==1 (
	ECHO [31mInvalid file path![0m
	ECHO.
	GOTO SETUP_DALAI
)
ECHO Dalai folder set to %DALAIPATH%

ECHO Creating configuration file
CD %USERPROFILE%\dalai_pi
SET CONFIGFILE=%USERPROFILE%\dalai_pi\installpath.json
SETLOCAL enabledelayedexpansion
SET "DALAIPATHESCAPED=!DALAIPATH:\=\\!"
SET "DALAIPATHESCAPED=!DALAIPATHESCAPED:"=!"
SET "DALAIPATHESCAPED=!DALAIPATHESCAPED: =_!"
MKDIR %DALAIPATHESCAPED% >NUL
ECHO ^{> %CONFIGFILE%
ECHO   "home": "%DALAIPATHESCAPED%">> %CONFIGFILE%
ECHO ^}>> %CONFIGFILE%

ECHO Installing yarn...
START /wait /B CMD /C npm install yarn -g
ECHO.
ECHO Installing Node modules...
ECHO [93mThis might take a while[0m
ECHO Please be patient
ECHO Do not close the window
START /wait /B CMD /C yarn install

ECHO.
for /f "tokens=2" %%A in ('mode con ^| find "Columns"') do set "WINDOW_WIDTH=%%A"
SET LINE=-
FOR /l %%i IN (2,1,%WINDOW_WIDTH%) DO CALL set "LINE=%%LINE%%%LINE%"
ECHO %LINE%
ECHO.

:DOWNLOAD_MODELS
CD %USERPROFILE%\dalai_pi
SET "GETLLAMA="
SET "GETALPACA="
choice /C YN /N /M "Would you like to download models now [Y,N]? "
SET SELECTEDCHOICE=%ERRORLEVEL%
IF %SELECTEDCHOICE%==2 GOTO NO_MODEL_DOWNLOAD

:LLAMA
ECHO.
choice /C YN /N /M "Do you want to download LLaMA [Y,N]? "
SET SELECTEDCHOICE=%ERRORLEVEL%
IF %SELECTEDCHOICE%==2 GOTO ALPACA
ECHO For the following choices, select yes or no to determine which model to download

choice /C YN /N /M "7B [Y,N]? "
SET SELECTEDCHOICE=%ERRORLEVEL%
IF %SELECTEDCHOICE%==1 (
	SET "LLAMA7B=7B "
	SET GETLLAMA=TRUE
)
IF %SELECTEDCHOICE%==2 SET "LLAMA7B= "
choice /C YN /N /M "13B [Y,N]? "
SET SELECTEDCHOICE=%ERRORLEVEL%
IF %SELECTEDCHOICE%==1 (
	SET "LLAMA13B=13B "
	SET GETLLAMA=TRUE
)
IF %SELECTEDCHOICE%==2 SET "LLAMA13B= "
choice /C YN /N /M "30B [Y,N]? "
SET SELECTEDCHOICE=%ERRORLEVEL%
IF %SELECTEDCHOICE%==1 (
	SET "LLAMA30B=30B "
	SET GETLLAMA=TRUE
)
IF %SELECTEDCHOICE%==2 SET "LLAMA30B= "
choice /C YN /N /M "65B [Y,N]? "
SET SELECTEDCHOICE=%ERRORLEVEL%
IF %SELECTEDCHOICE%==1 (
	SET "LLAMA65B=65B "
	SET GETLLAMA=TRUE
)
IF %SELECTEDCHOICE%==2 SET "LLAMA65B= "

:ALPACA
ECHO.
choice /C YN /N /M "Do you want to download Alpaca [Y,N]? "
IF %ERRORLEVEL%==2 GOTO START_MODEL_DOWNLOAD
ECHO For the following choices, select yes or no to determine which model to download

choice /C YN /N /M "7B [Y,N]? "
SET SELECTEDCHOICE=%ERRORLEVEL%
IF %SELECTEDCHOICE%==1 (
	SET "ALPACA7B=7B "
	SET GETALPACA=TRUE
)
IF %SELECTEDCHOICE%==2 SET "ALPACA7B= "

:START_MODEL_DOWNLOAD
IF DEFINED GETLLAMA (
	node bin\cli.js llama install %LLAMA7B%%LLAMA13B%%LLAMA30B%%LLAMA65B%
)
IF DEFINED GETALPACA (
	node bin\cli.js alpaca install %ALPACA7B%
)
GOTO START_WEBUI

:NO_MODEL_DOWNLOAD
ECHO.
ECHO No models will be downloaded...
choice /C YN /N /M "Would you like to start the Web UI anyways [Y,N]? "
IF %ERRORLEVEL%==1 GOTO START_WEBUI
ECHO.
ECHO Please place the models into the proper folders later
ECHO or run this script again to download them
GOTO END

:START_WEBUI
.\webui-start.bat

:END
ECHO [96mPress any key to exit...[0m
pause >nul