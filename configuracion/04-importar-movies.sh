#!/bin/sh
# Paso 4. Importa la coleccion movies de sample_mflix a traves de mongos.
#
# En PowerShell se copia directamente la linea de docker exec:
# docker exec mongos mongoimport --db sample_mflix --collection movies
#   --drop --file /datos/movies.json
#
# datos/movies.json tiene un documento por linea (21349 peliculas) y la
# carpeta datos/ esta montada en el contenedor de mongos como /datos.
# mongoimport se conecta al mongos del propio contenedor (localhost:27017).
# --drop borra la coleccion antes de importar, para poder repetir el paso.

export MSYS_NO_PATHCONV=1   # evita que Git Bash en Windows cambie /datos/...

docker exec mongos mongoimport --db sample_mflix --collection movies --drop --file /datos/movies.json
