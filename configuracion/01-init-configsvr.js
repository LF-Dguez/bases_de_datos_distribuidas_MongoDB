// Paso 1. Inicializa el replica set del config server.
//
// Se ejecuta desde el contenedor de mongos, donde estan montados los scripts:
// docker exec mongos mongosh --nodb --quiet
//   --file /scripts/configuracion/01-init-configsvr.js
//
// --nodb porque todavia no hay nada a que conectarse por defecto; la conexion
// al config server se abre aqui mismo por su nombre en la red de Docker.

const uri = "mongodb://configsvr:27017/?directConnection=true";
const admin = new Mongo(uri).getDB("admin");

const res = admin.runCommand({
  replSetInitiate: {
    _id: "configReplSet",
    configsvr: true,
    members: [{ _id: 0, host: "configsvr:27017" }]
  }
});

if (res.ok === 1) {
  print("configReplSet: replica set iniciado");
} else if (res.codeName === "AlreadyInitialized") {
  print("configReplSet: ya estaba iniciado");
} else {
  printjson(res);
  quit(1);
}

// La eleccion del PRIMARY tarda unos segundos.
for (let i = 0; i < 30; i++) {
  if (admin.runCommand({ hello: 1 }).isWritablePrimary) break;
  sleep(1000);
}

const estado = admin.runCommand({ replSetGetStatus: 1 });
estado.members.forEach(m => print(`  ${m.name}  ${m.stateStr}`));
