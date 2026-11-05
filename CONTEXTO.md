# Contexto del proyecto: Segundo parcial — Bases de Datos Distribuidas con MongoDB

> Documento para el equipo (y para cualquier asistente de IA que use alguno de nosotros).
> Resume **qué estamos construyendo, qué decisiones ya tomamos, quién hace qué y en qué vamos**.
> Si usas una IA para ayudarte, pásale este archivo completo antes de pedirle algo.

**Materia:** Bases de Datos Avanzadas — UACH, Facultad de Ingeniería, Grupo 5k2
**Docente:** José Saúl De Lira Miramontes
**Repositorio:** https://github.com/LF-Dguez/bases_de_datos_distribuidas_MongoDB

---

## 1. Lo que pide el profe

**Objetivo:** implementar soluciones para bases de datos distribuidas.

**Actividad** (sobre el cluster de la actividad anterior):
- Utilizar la base de datos `sample_mflix` y la colección `movies`.
- Agregar a los documentos de películas un `id_movie`.
- Configurar un cluster de MongoDB sobre Docker con los nodos: `configsvr`, `shard1`, `shard2`, `shard3`, **Replica set** y `mongos` (router).
- Definir el **shard key** de la colección, tipo **hashed**.
- Realizar operaciones **CRUD** sobre la base de datos distribuida.
- Mostrar un ejemplo de **balanceo de carga** entre shards.

**Nota del profe:** monitorear la distribución de los documentos en los shards **cada vez** que se realiza una operación CRUD (inserción, actualización, eliminación y consulta).

**Evidencia (repositorio en GitHub):** reporte de la práctica, Docker Compose, operaciones de configuración y operaciones CRUD.

---

## 2. Reparto del trabajo

| Integrante | Matrícula | Parte | Carpeta | Capturas | Sección del reporte |
|---|---|---|---|---|---|
| Luis Felipe Domínguez Chávez | 385500 | **1. Cluster y datos:** Docker Compose, replica sets, registro de shards, importación, `id_movie`, shard key hashed, script de monitoreo, plantilla del reporte | `configuracion/`, `monitoreo/` | 01–09 | 4 a 7 |
| Diego Flores Verdad Grijalva | 385660 | **2. Replica sets y balanceo:** estado de los replica sets, lectura en secundarios, failover; agregar shard3 y mostrar cómo el balanceador reparte los datos | `replicacion/`, `balanceo/` | 10–19 | 8 y 9 |
| Osvaldo Hernández Juárez | 385493 | **3. CRUD:** insert, find, update y delete sobre `movies`, con monitoreo después de cada operación | `crud/` | 20–39 | 10 |

La introducción ya está escrita. La conclusión se escribe al final entre los tres.

---

## 3. Arquitectura

```
                       ┌──────────────┐
  cliente ────────────▶│    mongos    │  router, puerto 27030 en el equipo
                       └──────┬───────┘
                              │           ┌──────────────┐
                              ├──────────▶│  configsvr   │  metadatos (configReplSet)
                              │           └──────────────┘
       ┌──────────────────────┼──────────────────────┐
┌──────▼───────┐       ┌──────▼───────┐       ┌──────▼───────┐
│ shard1ReplSet│       │ shard2ReplSet│       │ shard3ReplSet│
│ shard1-1 (P) │       │ shard2-1 (P) │       │ shard3-1 (P) │
│ shard1-2 (S) │       │ shard2-2 (S) │       │ shard3-2 (S) │
│ shard1-3 (S) │       │ shard2-3 (S) │       │ shard3-3 (S) │
└──────────────┘       └──────────────┘       └──────────────┘
   P = PRIMARY (recibe escrituras)   S = SECONDARY (copia de los datos)
```

- El cliente **siempre** entra por `mongos`. Conectarse directo a un shard solo muestra su parte de los datos.
- "Replica set" lo interpretamos así: **cada shard es un replica set de 3 miembros**. Así se puede mostrar la replicación y el failover. El ejemplo del profe (`udaykirankavaturu/sharding-demo`) usa replica sets de un miembro.
- `shard3` se levanta e inicializa desde el principio, pero **se registra hasta la parte de balanceo**. Así se ve cómo el balanceador le mueve datos cuando la colección ya está cargada.

---

## 4. Decisiones ya tomadas (no cambiarlas sin hablarlo)

| Decisión | Valor | Por qué |
|---|---|---|
| Base / colección | `sample_mflix.movies` | La pide el profe; 21 349 películas |
| Datos | `datos/movies.json`, un documento por línea (Extended JSON) | Se importa con `mongoimport` sin `--jsonArray`; conserva ObjectId y fechas |
| `id_movie` | Entero consecutivo 1–21 349, por orden de `_id` | Se asigna con `$setWindowFields` + `$documentNumber` + `$merge` (`configuracion/05-id-movie.js`) |
| Shard key | `{ id_movie: "hashed" }` | La pide el profe (hashed). `id_movie` es único y consecutivo; el hash reparte los valores consecutivos entre shards |
| Chunk size | **1 MB** (`config.settings`) | La colección pesa ~30 MB; con los 128 MB por defecto quedaría en un solo chunk y el balanceador no movería nada |
| Nodos | 11 contenedores (config + 3×3 shards + mongos) | Ver sección 3 |
| Imagen | `mongo:8.0` | Igual que en las actividades anteriores |
| Cache de cada `mongod` | `--wiredTigerCacheSizeGB 0.25` | Para que los 10 `mongod` quepan en la memoria de Docker Desktop |
| Puerto publicado | Solo `mongos` → `27030:27017` | El 27017 del equipo lo ocupa el MongoDB de Windows |
| Scripts | Montados en `mongos` en `/scripts/<carpeta>` (solo lectura); `datos/` en `/datos` | Se ejecutan con `mongosh --file` dentro del contenedor, sin depender de que cada quien tenga `mongosh` |
| Hosts | `nombreContenedor:27017`, **nunca** `localhost` | La dirección se guarda en la config del replica set |
| Autenticación | Ninguna | Práctica local |
| Commits | Uno por paso, con el nombre de quien lo hace | El historial es evidencia del avance |

### Nombres

| Nodo | Contenedores | Replica set |
|---|---|---|
| Config server | `configsvr` | `configReplSet` |
| Shard 1 | `shard1-1`, `shard1-2`, `shard1-3` | `shard1ReplSet` |
| Shard 2 | `shard2-1`, `shard2-2`, `shard2-3` | `shard2ReplSet` |
| Shard 3 | `shard3-1`, `shard3-2`, `shard3-3` | `shard3ReplSet` |
| Router | `mongos` | — |

El primer miembro de cada shard (`shardN-1`) tiene `priority: 2`, así que normalmente es el PRIMARY.

---

## 5. Estructura del repositorio

```
bases_de_datos_distribuidas_MongoDB/
├── docker-compose.yaml            → evidencia "Docker Compose"
├── datos/movies.json              sample_mflix.movies (21 349 documentos)
├── configuracion/                 → evidencia "Operaciones de Configuración" (Parte 1)
│   ├── 01-init-configsvr.js
│   ├── 02-init-shards.js
│   ├── 03-add-shards.js             registra shard1 y shard2
│   ├── 04-importar-movies.sh        comando de mongoimport
│   ├── 05-id-movie.js
│   └── 06-shard-collection.js       chunksize 1 MB + shard key hashed
├── monitoreo/distribucion.js      monitoreo de la distribución (lo usan todos)
├── replicacion/                   Parte 2 (Diego)
├── balanceo/                      Parte 2 (Diego)
├── crud/                          → evidencia "Operaciones CRUD" (Parte 3, Osvaldo)
├── reporte/main.tex               reporte en LaTeX (+ logos, img/)
├── README.md
└── CONTEXTO.md                    este archivo
```

---

## 6. Cómo dejar el cluster listo en tu máquina (todos)

Antes de tu parte, necesitas el cluster configurado. Desde la raíz del repo, en PowerShell:

```powershell
docker compose up -d
docker exec mongos mongosh --nodb --quiet --file /scripts/configuracion/01-init-configsvr.js
docker exec mongos mongosh --nodb --quiet --file /scripts/configuracion/02-init-shards.js
docker exec mongos mongosh --quiet --file /scripts/configuracion/03-add-shards.js
docker exec mongos mongoimport --db sample_mflix --collection movies --drop --file /datos/movies.json
docker exec mongos mongosh --quiet --file /scripts/configuracion/05-id-movie.js
docker exec mongos mongosh --quiet --file /scripts/configuracion/06-shard-collection.js
```

Espera unos minutos y revisa con el monitoreo que las películas ya estén repartidas entre shard1 y shard2:

```powershell
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
```

- Si tenías levantado el cluster de la actividad anterior (`MongoDB_cluster_sharding`), primero `docker compose down` en esa carpeta: usa los mismos nombres de contenedor y el mismo puerto.
- Para empezar desde cero: `docker compose down -v` (borra los datos) y repetir todo.
- En Git Bash hay que anteponer `MSYS_NO_PATHCONV=1` a los comandos con rutas `/scripts/...` o `/datos/...`.

### Cómo leer el monitoreo

- **Documentos**: los que le pertenecen a cada shard según sus chunks (`$shardedDataDistribution`). Suman el total de la colección.
- **Huérfanos**: copias que quedan en el shard de origen después de que el balanceador migra un chunk a otro shard. `mongos` nunca los devuelve en las consultas y el shard los borra solo, unos 15 minutos después de la migración. Es normal verlos durante y justo después del balanceo (Parte 2); en el reporte vale la pena explicarlo.
- El balanceador deja de mover datos cuando la diferencia entre shards es menor a 3 veces el tamaño de chunk (3 MB), por eso el reparto no queda exactamente igual.

---

## 7. Avance

- [x] Repositorio, Docker Compose y datos (Luis Felipe).
- [x] Scripts de configuración 01–06 y monitoreo (Luis Felipe).
- [x] Plantilla del reporte con portada, introducción y secciones 4 a 7 escritas (Luis Felipe).
- [x] Configuración probada en Docker (MongoDB 8.0.x) y capturas 01–09 tomadas (Luis Felipe). Resultado: 21 349 películas, `id_movie` 1–21 349; tras fragmentar, shard1 9 735 (45.6 %) y shard2 11 614 (54.4 %).
- [x] Parte 2: scripts de replica sets y balanceo, probados en el cluster y sección 8/9 del reporte llenada (Diego). Falta tomar las capturas 10–19.
- [ ] Parte 3: CRUD con monitoreo (Osvaldo).
- [ ] Conclusión, compilar el PDF y subirlo (todos).

---

## 8. Parte 2 — Replica sets y balanceo (Diego)

Scripts en `replicacion/` y `balanceo/` (borrar sus `.gitkeep`), ejecutados desde `mongos` con `docker exec mongos mongosh --quiet --file /scripts/<carpeta>/<archivo>.js`. Capturas **10–19** en `reporte/img/`. Sección "Replica sets de los shards" y "Mostrar un ejemplo de balanceo de carga entre shards" de `reporte/main.tex`.

**Replica sets** (sección 8 del reporte):
1. Estado de cada replica set: para cada shard, conectarse a un miembro (`new Mongo("mongodb://shard1-1:27017/?directConnection=true")`) y mostrar `replSetGetStatus`: nombre, `stateStr` (PRIMARY/SECONDARY) y `optimeDate` de cada miembro.
2. Mostrar que los SECONDARY tienen los mismos datos: contar las películas de `sample_mflix.movies` en el PRIMARY y en un SECONDARY del mismo shard (en el secundario hay que permitir la lectura, por ejemplo con `conn.setReadPref("secondary")`).
3. Failover: `docker stop shard1-1` (el PRIMARY), esperar unos segundos, mostrar que `shard1-2` o `shard1-3` pasó a PRIMARY y que una consulta a través de `mongos` sigue funcionando. Después `docker start shard1-1`: vuelve como SECONDARY y, al ponerse al día, recupera el PRIMARY por su `priority: 2`.

**Balanceo** (sección 9 del reporte). Requiere la configuración 01–06 terminada, con datos en shard1 y shard2:
1. Monitoreo **antes**: `monitoreo/distribucion.js` (dos shards).
2. Script `balanceo/01-agregar-shard3.js`: `sh.addShard("shard3ReplSet/shard3-1:27017,shard3-2:27017,shard3-3:27017")` y `listShards`.
3. Monitoreo **durante**: correr `distribucion.js` dos o tres veces mientras el balanceador mueve datos (sale `ronda de balanceo en curso: true`).
4. Monitoreo **después**: los tres shards con alrededor de un tercio de los documentos cada uno, más `sh.status()` (`docker exec -it mongos mongosh --quiet --eval "sh.status()"`).
5. Opcional: `sh.balancerCollectionStatus("sample_mflix.movies")` antes y después.

---

## 9. Parte 3 — CRUD con monitoreo (Osvaldo)

Scripts en `crud/` (borrar `crud/.gitkeep`), ejecutados con:
```powershell
docker exec mongos mongosh sample_mflix --quiet --file /scripts/crud/<archivo>.js
```
Con `--file` no se imprime nada automáticamente: usar `print()` / `printjson()`. Capturas **20–39** y sección "Realizar operaciones CRUD…" de `reporte/main.tex`.

Hacerlo **después del balanceo** (tres shards registrados). Si Diego aún no termina, en tu máquina puedes registrar shard3 tú mismo con su script o con `sh.addShard` (sección 8) para trabajar.

**Después de cada operación**, correr y capturar el monitoreo (lo pide el profe):
```powershell
docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
```

Lo mínimo que debe cubrir:
- **Create** (`create.js`): `insertOne` y `insertMany` de películas nuevas con `id_movie` **mayor a 21 349** (por ejemplo 21 350–22 349 para un lote de 1000, para que se note en el monitoreo cómo el hash reparte las nuevas entre los tres shards). Campos mínimos: `id_movie`, `title`, `year`, `genres`, `type: "movie"`.
- **Read** (`read.js`): `find` por `id_movie` y por otro campo (por ejemplo `genres`, `year`, `"imdb.rating"`). Con `explain()` mostrar que la consulta por `id_movie` va a **un solo shard** (`SINGLE_SHARD`) y la otra a **todos** (`SHARD_MERGE`).
- **Update** (`update.js`): `updateOne` por `id_movie` y `updateMany` (por ejemplo, a las películas insertadas). Mostrar `matchedCount`/`modifiedCount` y el documento modificado.
- **Delete** (`delete.js`): `deleteOne` por `id_movie` y `deleteMany` (por ejemplo, el lote insertado). Mostrar `deletedCount` y el conteo final.

Por cada operación en el reporte: el script con `\lstinputlisting[style=jsStyle]{../crud/archivo.js}`, el comando, la captura del resultado, la captura del monitoreo y una o dos oraciones.

---

## 10. Guía de capturas (todos)

- Docker Desktop con **Engine running**; una sola ventana de **PowerShell maximizada**, sin moverla entre capturas.
- `cls` antes de cada comando; capturar solo la ventana de la terminal (Win + Shift + S → ventana), con el comando y su salida completa.
- Guardar en `reporte/img/` como PNG, con el número de tu rango: `NN-descripcion.png` (por ejemplo `21-monitoreo-insert.png`). Si una salida no cabe, partirla en `a` y `b`.
- Si un comando da error o algo no coincide con lo esperado, **detenerse y avisar** al equipo.

Capturas de la Parte 1 (ya referenciadas en `main.tex`):

| Captura | Comando | Qué debe verse |
|---|---|---|
| `01-compose.png` | `docker compose up -d` y `docker compose ps` | 11 contenedores `Up`; `mongos` con `0.0.0.0:27030->27017` |
| `02-init-configsvr.png` | `01-init-configsvr.js` | `configsvr:27017  PRIMARY` |
| `03-init-shards.png` | `02-init-shards.js` | Cada shard con `shardN-1 PRIMARY` y dos `SECONDARY` |
| `04-add-shards.png` | `03-add-shards.js` | `addShard ... ok 1` para shard1 y shard2 |
| `05-importar-movies.png` | `mongoimport ...` | `21349 document(s) imported successfully` |
| `06-distribucion-inicial.png` | `monitoreo/distribucion.js` | 21 349 documentos en un solo shard; colección no fragmentada |
| `07-id-movie.png` | `05-id-movie.js` | `id_movie de 1 a 21349, 21349 valores distintos` |
| `08-shard-collection.png` | `06-shard-collection.js` | `chunksize: 1 MB`, índice `id_movie_hashed` y `collectionsharded` |
| `09-distribucion-fragmentada.png` | `monitoreo/distribucion.js` (unos minutos después) | Películas repartidas entre shard1 y shard2 (cerca de 45 % / 55 %). Si la columna Huérfanos no está en 0, esperar ~15 min y repetir |

---

## 11. Formato del reporte

- `reporte/main.tex` usa la plantilla de la materia: **XeLaTeX** (no pdfLaTeX; en Overleaf: Menu → Compiler → XeLaTeX), Arial (respaldo Liberation Sans), código en monoespaciada, color `#371E49`, portada de equipo, índice y referencias APA escritas a mano.
- Capturas con `\captura{archivo.png}{pie de figura}{ancho}` (ancho sugerido `(px / 90) / 16`, máximo 1.0); si la imagen no existe, se ve un recuadro con el nombre.
- Scripts: `\lstinputlisting[style=jsStyle]{../carpeta/archivo.js}`; comandos: `\begin{lstlisting}[style=plainStyle] ... \end{lstlisting}`.
- Quitar los recuadros `\pendiente{...}` de tu sección al terminar.
- Subtítulos con la redacción literal de la actividad. Español simple pero formal, una o dos oraciones por paso, sin exceso de negritas ni comillas; nombres de campos tal cual (`id_movie`, `genres`, `imdb.rating`).
- La fecha de la portada (`\fechaEntrega`) se ajusta el día de la entrega.

---

## 12. Instrucciones para asistentes de IA

- Responde en **español**.
- Respeta las decisiones y nombres de las secciones 3 y 4; no propongas otra arquitectura a menos que se pida.
- Todo acceso al cluster es vía `mongos`: `docker exec mongos mongosh ...` o `mongodb://localhost:27030` desde el host.
- Nunca uses `localhost` como host en `replSetInitiate` o `sh.addShard()`.
- Los scripts van en su carpeta como `.js` que se ejecutan con `mongosh --file /scripts/<carpeta>/<archivo>.js` dentro de `mongos`; usan `print()`/`printjson()` para mostrar resultados.
- Trabajamos paso a paso, explicando el porqué de cada comando.

## 13. Referencias

- Borucki, A. (2025). Capítulo 9 "Using replication and sharding", *MongoDB 8.0 in Action* (3a ed.). Manning.
- MongoDB Manual: Replication — https://www.mongodb.com/docs/manual/replication/
- MongoDB Manual: Sharding — https://www.mongodb.com/docs/manual/sharding/
- udaykirankavaturu, *sharding-demo* — https://github.com/udaykirankavaturu/sharding-demo (ejemplo del profe)
