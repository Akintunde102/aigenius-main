import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const it = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing/it.json'), 'utf8'),
);
const roSrc = fs.readFileSync(path.join(__dirname, '../src/locales/dictionaries/ro.ts'), 'utf8');
const m = roSrc.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
const roPartial = {};
if (m) {
  for (const line of m[1].split('\n')) {
    const single = line.match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (single) roPartial[single[1]] = single[2].replace(/\\'/g, "'");
  }
}

const pairs = [
  ['Modelli', 'Modele'],
  ['Strumenti', 'Instrumente'],
  ['Prezzi', 'Prețuri'],
  ['Accedi', 'Conectează-te'],
  ['Apri app', 'Deschide aplicația'],
  ['Usalo sul web', 'Folosește pe web'],
  ['Scarica per', 'Descarcă pentru'],
  ['prossimamente', 'în curând'],
  ['App desktop per', 'Aplicație desktop pentru'],
  ["Un'unica app", 'O singură aplicație'],
  ['Ogni modello', 'Fiecare model'],
  ['I tuoi file', 'Fișierele tale'],
  ['La tua macchina', 'Calculatorul tău'],
  ['Nessun abbonamento', 'Fără abonament'],
  ['crediti gratuiti', 'credite gratuite'],
  ['registrazione', 'înregistrare'],
  ['Seleziona lingua', 'Selectează limba'],
  ['Informazioni', 'Despre'],
  ['Conversazioni pubblicate', 'Conversații publicate'],
  ['Pagine pubblicate', 'Pagini publicate'],
  ['Scarica l\'app', 'Descarcă aplicația'],
  ['Apri menu', 'Deschide meniul'],
  ['Prodotto', 'Produs'],
  ['Account', 'Cont'],
  ['Legale', 'Legal'],
  ['Informativa sulla privacy', 'Politica de confidențialitate'],
  ['Termini di servizio', 'Termeni și condiții'],
  ['Chiudi', 'Închide'],
  ['Impostazioni', 'Setări'],
  ['Nuova chat', 'Chat nou'],
  ['Nuovo progetto', 'Proiect nou'],
  ['Cerca', 'Caută'],
  ['Copia', 'Copiază'],
  ['Elimina', 'Șterge'],
  ['Consenti', 'Permite'],
  ['Nega', 'Refuză'],
  ['messaggio', 'mesaj'],
  ['cartella', 'folder'],
  ['file', 'fișiere'],
  ['fatture', 'facturi'],
  ['browser', 'browser'],
  ['applicazione', 'aplicație'],
  ['abbonamento', 'abonament'],
  ['mensile', 'lunar'],
  ['o ', 'sau '],
  ['e ', 'și '],
];

function toRo(text) {
  let out = text;
  for (const [a, b] of pairs) out = out.split(a).join(b);
  return out;
}

const landing = {};
for (const [k, v] of Object.entries(it)) {
  landing[k] = roPartial[k] ?? toRo(v);
}

fs.writeFileSync(
  path.join(__dirname, 'batch2-native/ro.json'),
  JSON.stringify(landing, null, 2),
  'utf8',
);
console.log('ro', Object.keys(landing).length);
