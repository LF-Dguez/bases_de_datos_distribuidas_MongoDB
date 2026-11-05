// Paso 5. Agrega a cada pelicula un id_movie entero y consecutivo.
//
// docker exec mongos mongosh --quiet
//   --file /scripts/configuracion/05-id-movie.js
//
// $setWindowFields numera los documentos ordenados por _id con
// $documentNumber (1, 2, 3, ...). $toInt lo guarda como entero normal y
// $merge escribe el campo en la misma coleccion, buscando cada documento
// por su _id. Se hace antes de fragmentar porque id_movie sera la shard key.

const movies = db.getSiblingDB("sample_mflix").movies;

movies.aggregate([
  { $setWindowFields: {
      sortBy: { _id: 1 },
      output: { id_movie: { $documentNumber: {} } }
  } },
  { $project: { id_movie: { $toInt: "$id_movie" } } },
  { $merge: { into: "movies", on: "_id",
              whenMatched: "merge", whenNotMatched: "discard" } }
]);

const total = movies.countDocuments();
const conId = movies.countDocuments({ id_movie: { $exists: true } });
const rango = movies.aggregate([
  { $group: { _id: null,
              min: { $min: "$id_movie" },
              max: { $max: "$id_movie" },
              distintos: { $addToSet: "$id_movie" } } },
  { $project: { _id: 0, min: 1, max: 1, distintos: { $size: "$distintos" } } }
]).toArray()[0];

print(`Peliculas: ${total}`);
print(`Con id_movie: ${conId}`);
print(`id_movie de ${rango.min} a ${rango.max}, ` +
      `${rango.distintos} valores distintos`);

print("\nPrimeras tres peliculas:");
movies.find({}, { _id: 0, id_movie: 1, title: 1, year: 1 })
  .sort({ id_movie: 1 }).limit(3)
  .forEach(m => printjson(m));
