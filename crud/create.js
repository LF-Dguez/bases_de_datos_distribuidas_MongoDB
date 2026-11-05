// CRUD 1. Create: inserta peliculas nuevas en sample_mflix.movies.
//
// docker exec mongos mongosh sample_mflix --quiet
//   --file /scripts/crud/create.js
//
// Toda pelicula nueva lleva id_movie: es la shard key, y mongos calcula su
// hash para decidir en que shard se guarda. Se usan valores mayores a 21349
// (la ultima pelicula original) para distinguirlas de las importadas.
//  - insertOne: una pelicula (id_movie 21350).
//  - insertMany: un lote de 1000 peliculas (id_movie 21351 a 22350).

load("/scripts/crud/comun.js");

if (movies.countDocuments(NUEVAS) > 0) {
  print("Ya hay peliculas con id_movie mayor a 21349.");
  print("Ejecutar primero /scripts/crud/delete.js para empezar de nuevo.");
  quit(1);
}

print("=== Create ===\n");
distribucion("estado inicial");

// insertOne
print("1) insertOne (id_movie 21350)");
const uno = movies.insertOne({
  id_movie: 21350,
  title: "Bases de Datos Distribuidas",
  year: 2026,
  genres: ["Documentary"],
  runtime: 95,
  directors: ["Equipo 5K2"],
  countries: ["Mexico"],
  imdb: { rating: 8.5, votes: 3 },
  type: "movie"
});
print(`  acknowledged: ${uno.acknowledged}, insertedId: ${uno.insertedId}`);
imprimirDestino({ id_movie: 21350 });
distribucion("insertOne");

// insertMany: genera las 1000 peliculas del lote
print("2) insertMany (id_movie 21351 a 22350)");
const generos = ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi"];
const lote = [];
for (let id = 21351; id <= 22350; id++) {
  const n = id - 21351;
  lote.push({
    id_movie: id,
    title: `Pelicula de prueba ${n + 1}`,
    year: 2000 + (n % 27),
    genres: [generos[n % generos.length]],
    runtime: 80 + (n % 60),
    imdb: { rating: 5 + (n % 30) / 10, votes: 100 + n },
    type: "movie"
  });
}
const varios = movies.insertMany(lote);
print(`  acknowledged: ${varios.acknowledged}, ` +
      `insertedCount: ${Object.keys(varios.insertedIds).length}`);
distribucion("insertMany");

// Como quedaron repartidas las 1001 peliculas nuevas
print("Peliculas nuevas (id_movie > 21349) por shard:");
imprimirDestino(NUEVAS);
