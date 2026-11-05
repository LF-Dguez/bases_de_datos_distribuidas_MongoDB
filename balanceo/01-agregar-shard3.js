// Parte 2 (Diego). Registra shard3 con la coleccion ya cargada y fragmentada
// entre shard1 y shard2, para ver como el balanceador le mueve datos.
//
// docker exec mongos mongosh --quiet
//   --file /scripts/balanceo/01-agregar-shard3.js
//
// shard3 ya estaba levantado e inicializado como replica set desde el
// principio (configuracion/02-init-shards.js); lo unico que faltaba era
// registrarlo en el cluster. En cuanto mongos lo ve disponible, el
// balanceador empieza a moverle chunks por su cuenta, sin que haya que
// pedirselo.

const res = sh.addShard("shard3ReplSet/shard3-1:27017,shard3-2:27017,shard3-3:27017");
print(`addShard shard3ReplSet: ok ${res.ok}`);

print("\nShards registrados:");
db.adminCommand({ listShards: 1 }).shards
  .forEach(s => print(`  ${s._id}  ${s.host}`));
