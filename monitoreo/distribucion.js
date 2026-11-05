// Monitoreo de la distribucion de sample_mflix.movies entre los shards.
//
// docker exec mongos mongosh --quiet --file /scripts/monitoreo/distribucion.js
//
// Se corre despues de cada paso (importacion, fragmentacion, balanceo y cada
// operacion CRUD) para ver como quedan repartidos los documentos.

const bd = db.getSiblingDB("sample_mflix");
const config = db.getSiblingDB("config");
const ns = "sample_mflix.movies";

const hora = new Date().toISOString().slice(11, 19);
print(`=== Distribucion de ${ns} (${hora} UTC) ===`);
print(`Total de documentos: ${bd.movies.countDocuments()}\n`);

// Documentos y tamano en cada shard
const porShard = bd.movies.aggregate([
  { $collStats: { count: {}, storageStats: {} } },
  { $sort: { shard: 1 } }
]).toArray();

const total = porShard.reduce((s, x) => s + x.count, 0);
print("Shard            Documentos      %    Datos (MB)");
porShard.forEach(s => {
  const pct = total ? (100 * s.count / total).toFixed(1) : "0.0";
  const mb = (s.storageStats.size / 1048576).toFixed(2);
  const nombre = (s.shard || "sin fragmentar").padEnd(15);
  print(`${nombre}  ${String(s.count).padStart(10)}  ` +
        `${pct.padStart(5)}  ${mb.padStart(11)}`);
});

// Chunks de la coleccion en cada shard
const col = config.collections.findOne({ _id: ns });
if (col) {
  print("\nChunks por shard:");
  config.chunks.aggregate([
    { $match: { uuid: col.uuid } },
    { $group: { _id: "$shard", chunks: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).forEach(c => print(`  ${c._id}: ${c.chunks}`));
} else {
  print("\nLa coleccion todavia no esta fragmentada.");
}

const balanceador = sh.isBalancerRunning();
print(`\nBalanceador activo: ${sh.getBalancerState()}` +
      ` | ronda de balanceo en curso: ${balanceador.inBalancerRound}`);
