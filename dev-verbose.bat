@echo off
echo Starting Elux in verbose mode...
echo.

set NODE_ENV=development
set VERBOSE_LOGGING=true

npx tsx --watch --experimental-specifier-resolution=node server.ts

pause 