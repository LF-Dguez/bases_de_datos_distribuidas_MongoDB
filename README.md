# bases_de_datos_distribuidas_MongoDB

Cluster de MongoDB con sharding hashed en Docker sobre `sample_mflix.movies`.
Proyecto del segundo parcial — Bases de Datos Avanzadas, UACH Facultad de Ingeniería.

## Arquitectura
- `configsvr`: config server (replica set `configReplSet`, 1 miembro)
- `shard1`, `shard2`, `shard3`: cada uno es un replica set de 3 miembros
  (`shard1-1`, `shard1-2`, `shard1-3`, etc.): un PRIMARY y dos SECONDARY
- `mongos`: router, único nodo publicado al equipo (puerto **27030**)

Base de datos `sample_mflix`, colección `movies` (21 349 películas), shard key
`{ id_movie: "hashed" }`.

## Requisitos
- Docker Desktop (Docker y Docker Compose v2), con unos 4 GB de memoria libres.
- Si tienes levantado el cluster de la actividad anterior (`MongoDB_cluster_sharding`),
  apágalo primero con `docker compose down` en esa carpeta: usa los mismos nombres
  de contenedor (`configsvr`, `mongos`) y el mismo puerto.

## Cómo levantar el cluster

Todos los comandos se corren en PowerShell desde la raíz del repositorio. Las
carpetas de scripts y `datos/` se montan dentro del contenedor `mongos`, así que
los scripts se ejecutan con el `mongosh` de ese contenedor. En Git Bash hay que
anteponer `MSYS_NO_PATHCONV=1` para que no cambie las rutas `/scripts/...`.

1. Levantar los contenedores:
   ```bash
   docker compose up -d
   docker compose ps
   ```

2. Inicializar los replica sets del config server y de los tres shards:
   ```bash
   docker exec mongos mongosh --nodb --quiet --file /scripts/configuracion/01-init-configsvr.js
   docker exec mongos mongosh --nodb --quiet --file /scripts/configuracion/02-init-shards.js
   ```

3. Registrar shard1 y shard2 (shard3 se agrega en el paso de balanceo):
   ```bash
   docker exec mongos mongosh --quiet --file /scripts/configuracion/03-add-shards.js
   ```

4. Importar `sample_mflix.movies`:
   ```bash
   docker exec mongos mongoimport --db sample_mflix --collection movies --drop --file /datos/movies.json
   ```

5. Agregar `id_movie` a cada película:
   ```bash
   docker exec mongos mongosh --quiet --file /scripts/configuracion/05-id-movie.js
   ```

6. Definir la shard key hashed y fragmentar la colección:
   ```bash
   docker exec mongos mongosh --quiet --file /scripts/configuracion/06-shard-collection.js
   ```

7. Monitorear la distribución (se repite después de cada paso):
   ```bash
   docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
   ```

Desde el equipo (por ejemplo, con Compass) la conexión es `mongodb://localhost:27030`.

## Replica sets y failover

```bash
# Estado de los tres replica sets (un PRIMARY y dos SECONDARY cada uno)
docker exec mongos mongosh --quiet --file /scripts/replicacion/01-estado-replicasets.js

# El SECONDARY de shard1 tiene los mismos datos que su PRIMARY
docker exec mongos mongosh --quiet --file /scripts/replicacion/02-lectura-secundario.js

# Failover: tumbar el PRIMARY de shard1 y ver la elección del nuevo
docker stop shard1-1
docker exec mongos mongosh --quiet --file /scripts/replicacion/03-failover-caida.js

# Recuperación: shard1-1 vuelve como SECONDARY y recupera el PRIMARY por su prioridad
docker start shard1-1
docker exec mongos mongosh --quiet --file /scripts/replicacion/04-recuperacion.js
```

## Balanceo de carga

```bash
# Distribución antes de agregar shard3 (solo shard1 y shard2)
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js

# Registrar shard3 con la colección ya cargada
docker exec mongos mongosh --quiet --file /scripts/balanceo/01-agregar-shard3.js

# Monitorear mientras el balanceador mueve datos (correr varias veces)
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js

# Estado final del cluster con los tres shards
docker exec mongos mongosh --quiet --eval "sh.status()"
```

## Operaciones CRUD

Se hacen después del balanceo, con los tres shards registrados. Los scripts
están en `crud/` y cargan `crud/comun.js`, que muestra la distribución por
shard después de cada operación y, con `explain()`, a qué shards fue cada una.
Después de cada script se corre el monitoreo completo:

```bash
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js   # antes
docker exec mongos mongosh sample_mflix --quiet --file /scripts/crud/create.js
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
docker exec mongos mongosh sample_mflix --quiet --file /scripts/crud/read.js
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
docker exec mongos mongosh sample_mflix --quiet --file /scripts/crud/update.js
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
docker exec mongos mongosh sample_mflix --quiet --file /scripts/crud/delete.js
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
```

- `create.js`: `insertOne` (id_movie 21350) e `insertMany` (id_movie 21351–22350).
- `read.js`: `find` por id_movie (`SINGLE_SHARD`), por `genres`/`year`/`imdb.rating`
  y por rango de id_movie (`SHARD_MERGE`, todos los shards).
- `update.js`: `updateOne` por id_movie, `updateMany` del lote y un `updateOne` que
  cambia el id_movie y mueve el documento a otro shard.
- `delete.js`: `deleteOne` y `deleteMany`; la colección vuelve a 21 349 películas.

Los scripts se pueden repetir en orden: `create.js` se detiene si ya hay películas
con id_movie mayor a 21349 (en ese caso, correr antes `delete.js`).

## Estructura
- `docker-compose.yaml`: definición de los 11 contenedores
- `datos/movies.json`: `sample_mflix.movies`, un documento por línea (Extended JSON)
- `configuracion/`: scripts de configuración, en el orden en que se ejecutan
- `monitoreo/`: script de monitoreo de la distribución entre shards
- `replicacion/`: pruebas de los replica sets
- `balanceo/`: ejemplo de balanceo de carga al agregar shard3
- `crud/`: operaciones CRUD sobre `movies` (`comun.js` tiene las funciones de monitoreo)
- `reporte/`: reporte de la práctica en LaTeX
- `CONTEXTO.md`: decisiones, reparto del trabajo y avance del proyecto

## Apagar el cluster
```bash
docker compose down        # conserva los datos en los volúmenes
docker compose down -v     # borra también los volúmenes (hay que volver a configurar)
```
