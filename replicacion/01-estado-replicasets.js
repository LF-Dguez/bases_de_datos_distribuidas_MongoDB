// Parte 2 (Diego). Estado de los tres replica sets: un PRIMARY y dos
// SECONDARY por shard, con la hora del ultimo dato replicado en cada uno.
//
// docker exec mongos mongosh --quiet
//   --file /scripts/replicacion/01-estado-replicasets.js
//
// Se conecta directo a un miembro de cada shard (no a mongos, que no expone
// el estado del replica set) con directConnection para no depender de que
// ese miembro sea el PRIMARY.

const shards = ["shard1", "shard2", "shard3"];

shards.forEach(nombre => {
  const rs = `${nombre}ReplSet`;
  const uri = `mongodb://${nombre}-1:27017/?directConnection=true`;
  const admin = new Mongo(uri).getDB("admin");
  const estado = admin.runCommand({ replSetGetStatus: 1 });

  print(`${rs}:`);
  estado.members.forEach(m => {
    const optime = m.optimeDate ? m.optimeDate.toISOString() : "-";
    print(`  ${m.name.padEnd(16)} ${m.stateStr.padEnd(10)} optimeDate: ${optime}`);
  });
  print("");
});
