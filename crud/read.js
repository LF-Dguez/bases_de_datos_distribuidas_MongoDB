// CRUD 2. Read: consultas sobre sample_mflix.movies a traves de mongos.
//
// docker exec mongos mongosh sample_mflix --quiet
//   --file /scripts/crud/read.js
//
// Con explain() se ve a cuantos shards manda mongos cada consulta:
//  - Si el filtro tiene la shard key (id_movie), mongos calcula el hash y
//    consulta un solo shard (etapa SINGLE_SHARD).
//  - Si no la tiene, la consulta va a todos los shards y mongos junta los
//    resultados (etapa SHARD_MERGE o SHARD_MERGE_SORT si hay sort).
// Una consulta no cambia la distribucion; se monitorea igual para mostrarlo.

load("/scripts/crud/comun.js");

print("=== Read ===\n");

// 1) find por la shard key: una pelicula original y una insertada
print("1) find por id_movie (shard key)");
[1, 21350].forEach(id => {
  const p = movies.findOne({ id_movie: id },
    { _id: 0, id_movie: 1, title: 1, year: 1, genres: 1 });
  mostrar(p);
  imprimirDestino({ id_movie: id });
  print("");
});
distribucion("find por id_movie");

// 2) find por otros campos: genres, year e imdb.rating
print("2) find por genres, year e imdb.rating (sin shard key)");
const filtro = { genres: "Comedy", year: { $gte: 2010 },
                 "imdb.rating": { $gte: 8 } };
print(`  Filtro: ${JSON.stringify(filtro)}`);
print(`  Peliculas que cumplen el filtro: ${movies.countDocuments(filtro)}`);
print("  Las 5 con mejor calificacion:");
movies.find(filtro,
  { _id: 0, id_movie: 1, title: 1, year: 1, "imdb.rating": 1 })
  .sort({ "imdb.rating": -1, id_movie: 1 }).limit(5)
  .forEach(p => print(`    ${p.id_movie}  ${p.title} (${p.year})` +
                      `  rating ${p.imdb.rating}`));
imprimirDestino(filtro);
print("");
distribucion("find por genres, year e imdb.rating");

// 3) find sobre el lote insertado (rango de id_movie). Aunque usa la shard
// key, es un rango: con sharding hashed los valores consecutivos estan
// repartidos al azar, asi que mongos tiene que consultar todos los shards.
print("3) find de las peliculas insertadas (id_movie > 21349)");
print(`  Total: ${movies.countDocuments(NUEVAS)}`);
imprimirDestino(NUEVAS);
print("");
distribucion("find de las peliculas insertadas");
