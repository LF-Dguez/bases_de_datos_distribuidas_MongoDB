// Parte 2 (Diego). Compara el PRIMARY y un SECONDARY del mismo shard para
// mostrar que el SECONDARY tiene copiados los mismos datos.
//
// docker exec mongos mongosh --quiet
//   --file /scripts/replicacion/02-lectura-secundario.js
//
// Se usa shard1 como ejemplo. shard1-1 es el PRIMARY (priority 2);
// shard1-2 es un SECONDARY. Por defecto un SECONDARY rechaza lecturas para
// evitar que una app se conecte ahi por error, asi que hay que permitirlas
// explicitamente con setReadPref("secondary").

const primario = new Mongo("mongodb://shard1-1:27017/?directConnection=true");
const secundario = new Mongo("mongodb://shard1-2:27017/?directConnection=true");
secundario.setReadPref("secondary");

const colPrimario = primario.getDB("sample_mflix").movies;
const colSecundario = secundario.getDB("sample_mflix").movies;

const totalPrimario = colPrimario.countDocuments();
const totalSecundario = colSecundario.countDocuments();

print(`shard1-1 (PRIMARY)   peliculas: ${totalPrimario}`);
print(`shard1-2 (SECONDARY) peliculas: ${totalSecundario}`);

if (totalPrimario === totalSecundario) {
  print("\nEl SECONDARY tiene el mismo numero de documentos que el PRIMARY.");
} else {
  print("\nLos totales no coinciden (puede que la replicacion siga en curso).");
}

// Un documento cualquiera, comparado tal cual, para confirmar que no solo
// coincide la cantidad sino el contenido.
const muestra = colPrimario.findOne();
const copia = colSecundario.findOne({ _id: muestra._id });
print(`\n¿La pelicula "${muestra.title}" es identica en ambos nodos? ` +
      `${JSON.stringify(muestra) === JSON.stringify(copia)}`);
