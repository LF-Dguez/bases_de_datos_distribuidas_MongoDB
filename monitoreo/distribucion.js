// Monitoreo de la distribucion de sample_mflix.movies entre los shards.
//
// docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
//
// Se corre despues de cada paso (importacion, fragmentacion, balanceo y cada
// operacion CRUD) para ver como quedan repartidos los documentos.
//
// Documentos = los que le pertenecen al shard segun sus chunks.
// Huerfanos  = copias que quedaron en un shard despues de migrar un chunk a
//              otro. mongos nunca los devuelve en las consultas y el shard
//              los borra solo unos minutos despues de la migracion.

const bd = db.getSiblingDB("sample_mflix");
const config = db.getSiblingDB("config");
const ns = "sample_mflix.movies";

const hora = new Date().toISOString().slice(11, 19);
print(`=== Distribucion de ${ns} (${hora} UTC) ===`);
const total = bd.movies.countDocuments();
print(`Total de documentos: ${total}\n`);

const col = config.collections.findOne({ _id: ns });

if (!col) {
  // Coleccion sin fragmentar: todo esta en el shard primario de la base
  print("Shard            Documentos      %    Datos (MB)");
  bd.movies.aggregate([{ $collStats: { count: {}, storageStats: {} } }])
    .forEach(s => {
      const pct = total ? (100 * s.count / total).toFixed(1) : "0.0";
      const mb = (s.storageStats.size / 1048576).toFixed(2);
      print(`${s.shard.padEnd(15)}  ${String(s.count).padStart(10)}  ` +
            `${pct.padStart(5)}  ${mb.padStart(11)}`);
    });
  print("\nLa coleccion todavia no esta fragmentada.");
} else {
  const dist = db.getSiblingDB("admin").aggregate([
    { $shardedDataDistribution: {} },
    { $match: { ns: ns } }
  ]).toArray()[0].shards;

  const chunks = {};
  config.chunks.aggregate([
    { $match: { uuid: col.uuid } },
    { $group: { _id: "$shard", n: { $sum: 1 } } }
  ]).forEach(c => { chunks[c._id] = c.n; });

  dist.sort((a, b) => a.shardName.localeCompare(b.shardName));
  const fila = (c) => c[0].padEnd(15) + c.slice(1)
    .map((v, i) => String(v).padStart([12, 7, 8, 7, 11][i])).join("");
  print(fila(["Shard", "Documentos", "%", "Chunks", "MB", "Huerfanos"]));
  dist.forEach(s => {
    const pct = total ? 100 * s.numOwnedDocuments / total : 0;
    print(fila([s.shardName, s.numOwnedDocuments, pct.toFixed(1),
                chunks[s.shardName] || 0,
                (s.ownedSizeBytes / 1048576).toFixed(1), s.numOrphanedDocs]));
  });
}

const balanceador = sh.isBalancerRunning();
print(`\nBalanceador activo: ${sh.getBalancerState()}` +
      ` | ronda de balanceo en curso: ${balanceador.inBalancerRound}`);
