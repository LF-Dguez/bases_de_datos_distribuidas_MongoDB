// Paso 6. Define la shard key hashed sobre id_movie y fragmenta movies.
//
// docker exec mongos mongosh --quiet
//   --file /scripts/configuracion/06-shard-collection.js
//
// Shard key: { id_movie: "hashed" }
//  - id_movie es unico: cardinalidad maxima y ningun valor repetido.
//  - Es consecutivo; con sharding por rangos las peliculas nuevas caerian
//    siempre en el ultimo chunk. El hash reparte los valores entre shards.
//  - Buscar, actualizar o borrar por id_movie va a un solo shard.
//
// Tamano de chunk: la coleccion pesa unos 30 MB y el tamano por defecto es
// 128 MB, asi que con ese valor todo se quedaria en un solo chunk y el
// balanceador no moveria nada. Se baja a 1 MB para que los datos se repartan.

const config = db.getSiblingDB("config");
config.settings.updateOne(
  { _id: "chunksize" },
  { $set: { value: 1 } },
  { upsert: true }
);
print(`chunksize: ${config.settings.findOne({ _id: "chunksize" }).value} MB`);

const movies = db.getSiblingDB("sample_mflix").movies;

// Para fragmentar una coleccion con datos debe existir el indice
// de la shard key
print(`Indice creado: ${movies.createIndex({ id_movie: "hashed" })}`);

printjson(sh.enableSharding("sample_mflix"));
printjson(sh.shardCollection("sample_mflix.movies", { id_movie: "hashed" }));

const info = config.collections.findOne({ _id: "sample_mflix.movies" });
print(`\nShard key de sample_mflix.movies: ${JSON.stringify(info.key)}`);
print("El balanceador empieza a mover datos entre shard1 y shard2;");
print("revisar el avance con monitoreo/distribucion.js");
