// Parte 2 (Diego). Recuperacion: correr DESPUES de volver a encender shard1-1.
//
// En PowerShell:
//   docker start shard1-1
//   docker exec mongos mongosh --quiet --file /scripts/replicacion/04-recuperacion.js
//
// shard1-1 vuelve primero como SECONDARY (tiene que ponerse al dia con lo
// que paso mientras estuvo apagado). Como tiene priority 2, en cuanto
// termina de sincronizar provoca una nueva eleccion y recupera el PRIMARY.
// El script espera hasta un minuto mostrando el estado en cada vuelta.

const admin = new Mongo("mongodb://shard1-2:27017/?directConnection=true").getDB("admin");

for (let intento = 1; intento <= 12; intento++) {
  const estado = admin.runCommand({ replSetGetStatus: 1 });
  const shard1_1 = estado.members.find(m => m.name === "shard1-1:27017");

  print(`--- intento ${intento} ---`);
  estado.members.forEach(m => print(`  ${m.name.padEnd(16)} ${m.stateStr}`));

  if (shard1_1 && shard1_1.stateStr === "PRIMARY") {
    print("\nshard1-1 ya recupero el PRIMARY (por su priority 2).");
    break;
  }
  sleep(5000);
}
