// Paso 3. Registra shard1 y shard2 en el cluster.
//
// docker exec mongos mongosh --quiet
//   --file /scripts/configuracion/03-add-shards.js
//
// shard3 ya esta levantado e inicializado, pero se registra hasta la parte de
// balanceo (balanceo/01-agregar-shard3.js): asi se ve como el balanceador le
// mueve datos a un shard nuevo cuando la coleccion ya esta cargada.
//
// Cada shard se registra con el nombre de su replica set y sus tres miembros.

const shards = [
  "shard1ReplSet/shard1-1:27017,shard1-2:27017,shard1-3:27017",
  "shard2ReplSet/shard2-1:27017,shard2-2:27017,shard2-3:27017"
];

shards.forEach(cadena => {
  const res = sh.addShard(cadena);
  print(`addShard ${cadena.split("/")[0]}: ok ${res.ok}`);
});

print("\nShards registrados:");
db.adminCommand({ listShards: 1 }).shards
  .forEach(s => print(`  ${s._id}  ${s.host}`));
