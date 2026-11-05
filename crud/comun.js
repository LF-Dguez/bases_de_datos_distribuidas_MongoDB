// Funciones que usan los scripts de CRUD (create, read, update y delete).
//
// Cada script la carga al inicio con:
//   load("/scripts/crud/comun.js");
//
// distribucion(): muestra cuantos documentos tiene cada shard justo despues
//                 de una operacion, para seguir la distribucion paso a paso.
// mostrar(doc): imprime un documento en una sola linea.
// destino(filtro): con explain() dice a que shards envia mongos una consulta
//                  y cuantos documentos devolvio cada uno.

const movies = db.getSiblingDB("sample_mflix").movies;
const NS = "sample_mflix.movies";

// Peliculas que se crean en la practica: id_movie mayor al de la ultima
// pelicula original (21349).
const ULTIMO_ORIGINAL = 21349;
const NUEVAS = { id_movie: { $gt: ULTIMO_ORIGINAL } };

function distribucion(titulo) {
  const shards = db.getSiblingDB("admin").aggregate([
    { $shardedDataDistribution: {} },
    { $match: { ns: NS } }
  ]).toArray()[0].shards;
  shards.sort((a, b) => a.shardName.localeCompare(b.shardName));

  print(`  -> Distribucion despues de: ${titulo}`);
  shards.forEach(s => print(`       ${s.shardName.padEnd(15)}` +
    `${String(s.numOwnedDocuments).padStart(7)} documentos`));
  print(`       ${"Total".padEnd(15)}` +
    `${String(movies.countDocuments()).padStart(7)} documentos\n`);
}

function mostrar(doc) {
  print(`  ${JSON.stringify(doc)}`);
}

function destino(filtro) {
  const e = movies.find(filtro).explain("executionStats");
  return {
    etapa: e.queryPlanner.winningPlan.stage,
    shards: e.executionStats.executionStages.shards
      .map(s => ({ shard: s.shardName, devueltos: s.nReturned }))
      .sort((a, b) => a.shard.localeCompare(b.shard))
  };
}

function imprimirDestino(filtro) {
  const d = destino(filtro);
  const n = d.shards.length;
  print(`  Plan de mongos: ${d.etapa}, consulta ${n} ` +
        (n === 1 ? "shard" : "shards"));
  d.shards.forEach(s => print(`       ${s.shard.padEnd(15)}` +
    `${String(s.devueltos).padStart(7)} documentos devueltos`));
}
