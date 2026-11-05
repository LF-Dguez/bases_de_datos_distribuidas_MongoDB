// CRUD 3. Update: actualiza peliculas de sample_mflix.movies.
//
// docker exec mongos mongosh sample_mflix --quiet
//   --file /scripts/crud/update.js
//
//  - updateOne por id_movie: mongos la manda a un solo shard.
//  - updateMany sobre las peliculas insertadas: va a todos los shards.
//    Cambiar otros campos no mueve documentos, la distribucion queda igual.
//  - updateOne que cambia el valor de id_movie: como es la shard key, el
//    nuevo hash puede pertenecer a otro shard y el documento se mueve.
//    MongoDB lo permite si el filtro tiene la shard key completa y la
//    escritura es reintentable (mongosh lo hace por defecto).

load("/scripts/crud/comun.js");

if (movies.countDocuments(NUEVAS) === 0) {
  print("No hay peliculas insertadas: ejecutar primero /scripts/crud/create.js");
  quit(1);
}

print("=== Update ===\n");
const proy = { _id: 0, id_movie: 1, title: 1, genres: 1, imdb: 1,
               estado: 1, lastupdated: 1 };

// 1) updateOne por id_movie
print("1) updateOne (id_movie 21350)");
const r1 = movies.updateOne(
  { id_movie: 21350 },
  { $set: { "imdb.rating": 9.1 },
    $inc: { "imdb.votes": 1 },
    $push: { genres: "Education" },
    $currentDate: { lastupdated: true } }
);
print(`  matchedCount: ${r1.matchedCount}, modifiedCount: ${r1.modifiedCount}`);
mostrar(movies.findOne({ id_movie: 21350 }, proy));
imprimirDestino({ id_movie: 21350 });
print("");
distribucion("updateOne");

// 2) updateMany sobre el lote insertado
print("2) updateMany (peliculas con id_movie > 21349)");
const r2 = movies.updateMany(
  NUEVAS,
  { $set: { estado: "revisada" }, $inc: { "imdb.votes": 10 } }
);
print(`  matchedCount: ${r2.matchedCount}, modifiedCount: ${r2.modifiedCount}`);
print("  Ejemplo de pelicula modificada:");
mostrar(movies.findOne({ id_movie: 21351 }, proy));
print(`  Peliculas con estado "revisada": ` +
      `${movies.countDocuments({ estado: "revisada" })}`);
distribucion("updateMany");

// 3) updateOne que cambia la shard key. Se busca un id_movie nuevo cuyo hash
// pertenezca a otro shard, para que se vea el documento moverse.
print("3) updateOne que cambia id_movie (shard key) de 21350 a otro valor");
const origen = destino({ id_movie: 21350 }).shards[0].shard;
let nuevoId = 30000;
while (destino({ id_movie: nuevoId }).shards[0].shard === origen) nuevoId++;
const shardNuevo = destino({ id_movie: nuevoId }).shards[0].shard;

print(`  id_movie 21350 esta en ${origen}; ` +
      `id_movie ${nuevoId} pertenece a ${shardNuevo}`);
const r3 = movies.updateOne(
  { id_movie: 21350 },
  { $set: { id_movie: nuevoId } }
);
print(`  matchedCount: ${r3.matchedCount}, modifiedCount: ${r3.modifiedCount}`);
print(`  Busqueda por id_movie 21350: ` +
      `${movies.countDocuments({ id_movie: 21350 })} documentos`);
print(`  Busqueda por id_movie ${nuevoId}:`);
mostrar(movies.findOne({ id_movie: nuevoId },
  { _id: 0, id_movie: 1, title: 1 }));
imprimirDestino({ id_movie: nuevoId });
print("");
distribucion(`updateOne de id_movie 21350 -> ${nuevoId}`);
