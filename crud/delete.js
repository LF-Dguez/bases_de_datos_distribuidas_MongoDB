// CRUD 4. Delete: elimina las peliculas creadas en la practica.
//
// docker exec mongos mongosh sample_mflix --quiet
//   --file /scripts/crud/delete.js
//
//  - deleteOne por id_movie: mongos la manda a un solo shard.
//  - deleteMany del lote insertado: va a todos los shards y cada uno borra
//    sus documentos. Al final la coleccion vuelve a tener 21349 peliculas.
// Las peliculas originales no se tocan.

load("/scripts/crud/comun.js");

print("=== Delete ===\n");
distribucion("estado inicial");

// 1) deleteOne: la pelicula de insertOne. update.js le cambio el id_movie,
// asi que primero se consulta cual tiene ahora.
print("1) deleteOne (pelicula \"Bases de Datos Distribuidas\")");
const p = movies.findOne({ title: "Bases de Datos Distribuidas" },
                         { _id: 0, id_movie: 1, title: 1 });
if (p) {
  print(`  id_movie actual: ${p.id_movie}`);
  imprimirDestino({ id_movie: p.id_movie });
  const r1 = movies.deleteOne({ id_movie: p.id_movie });
  print(`  deletedCount: ${r1.deletedCount}`);
  print(`  Busqueda despues de borrar: ` +
        `${movies.countDocuments({ id_movie: p.id_movie })} documentos`);
} else {
  print("  No se encontro la pelicula (ya estaba borrada)");
}
print("");
distribucion("deleteOne");

// 2) deleteMany: el resto de las peliculas insertadas
print("2) deleteMany (peliculas con id_movie > 21349)");
print(`  Por borrar: ${movies.countDocuments(NUEVAS)}`);
imprimirDestino(NUEVAS);
const r2 = movies.deleteMany(NUEVAS);
print(`  deletedCount: ${r2.deletedCount}`);
print(`  Quedan con id_movie > 21349: ${movies.countDocuments(NUEVAS)}`);
print(`  Peliculas en la coleccion: ${movies.countDocuments()}`);
print("");
distribucion("deleteMany");
