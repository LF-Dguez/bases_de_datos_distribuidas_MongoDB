// Paso 2. Inicializa los tres shards, cada uno como replica set de 3 miembros.
//
// docker exec mongos mongosh --nodb --quiet
//   --file /scripts/configuracion/02-init-shards.js
//
// replSetInitiate se ejecuta en el primer miembro de cada shard con la lista
// completa de miembros. El primero lleva priority 2 para que sea el PRIMARY;
// los otros dos quedan como SECONDARY y copian sus datos.

const shards = ["shard1", "shard2", "shard3"];

shards.forEach(nombre => {
  const rs = `${nombre}ReplSet`;
  const hosts = [1, 2, 3].map(n => `${nombre}-${n}:27017`);

  const uri = `mongodb://${hosts[0]}/?directConnection=true`;
  const admin = new Mongo(uri).getDB("admin");

  const res = admin.runCommand({
    replSetInitiate: {
      _id: rs,
      members: hosts.map((host, i) => ({
        _id: i,
        host: host,
        priority: i === 0 ? 2 : 1
      }))
    }
  });

  if (res.ok === 1) {
    print(`${rs}: replica set iniciado`);
  } else if (res.codeName === "AlreadyInitialized") {
    print(`${rs}: ya estaba iniciado`);
  } else {
    printjson(res);
    quit(1);
  }

  // Espera a que haya PRIMARY y a que los secundarios terminen de sincronizar
  for (let i = 0; i < 60; i++) {
    const st = admin.runCommand({ replSetGetStatus: 1 });
    const listos = st.ok === 1 && st.members.every(
      m => m.stateStr === "PRIMARY" || m.stateStr === "SECONDARY");
    if (listos && st.members.some(m => m.stateStr === "PRIMARY")) break;
    sleep(1000);
  }

  const estado = admin.runCommand({ replSetGetStatus: 1 });
  estado.members.forEach(m => print(`  ${m.name}  ${m.stateStr}`));
});
