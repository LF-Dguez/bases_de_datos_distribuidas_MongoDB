// Parte 2 (Diego). Failover: correr DESPUES de tumbar al PRIMARY de shard1.
//
// En PowerShell, desde la raiz del repo:
//   docker stop shard1-1
//   (esperar unos 10-15 segundos a que los dos SECONDARY elijan uno nuevo)
//   docker exec mongos mongosh --quiet --file /scripts/replicacion/03-failover-caida.js
//
// Se consulta el estado desde shard1-2 porque shard1-1 (el que estaba
// conectado antes) ya no responde. Despues se hace una consulta normal a
// traves de mongos para demostrar que el cluster sigue funcionando aunque
// le falte un nodo: mongos solo necesita que cada shard tenga un PRIMARY,
// sin importar cual de los tres sea.

const admin = new Mongo("mongodb://shard1-2:27017/?directConnection=true").getDB("admin");
const estado = admin.runCommand({ replSetGetStatus: 1 });

print("shard1ReplSet (con shard1-1 caido):");
estado.members.forEach(m => print(`  ${m.name.padEnd(16)} ${m.stateStr}`));

const nuevoPrimario = estado.members.find(m => m.stateStr === "PRIMARY");
print(nuevoPrimario
  ? `\nEl nuevo PRIMARY es ${nuevoPrimario.name}.`
  : "\nTodavia no hay PRIMARY, puede que la eleccion siga en curso.");

print("\n--- Consulta a traves de mongos (debe seguir funcionando) ---");
const bd = db.getSiblingDB("sample_mflix");
const total = bd.movies.countDocuments();
print(`Total de peliculas visibles desde mongos: ${total}`);
