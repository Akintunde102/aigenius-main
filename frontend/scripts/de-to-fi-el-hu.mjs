import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const de = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing/de.json'), 'utf8'),
);

function extractPartial(mod) {
  const src = fs.readFileSync(path.join(__dirname, `../src/locales/dictionaries/${mod}.ts`), 'utf8');
  const m = src.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
  const partial = {};
  if (!m) return partial;
  for (const line of m[1].split('\n')) {
    const single = line.match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (single) partial[single[1]] = single[2].replace(/\\'/g, "'");
  }
  return partial;
}

const fiPairs = [
  ['Modelle', 'Mallit'],
  ['Desktop', 'Työpöytä'],
  ['Werkzeuge', 'Työkalut'],
  ['Preise', 'Hinnat'],
  ['Anmelden', 'Kirjaudu sisään'],
  ['App öffnen', 'Avaa sovellus'],
  ['Im Web nutzen', 'Käytä verkossa'],
  ['Download für', 'Lataa'],
  ['demnächst', 'tulossa pian'],
  ['Desktop-App für', 'Työpöytäsovellus'],
  ['Eine App. Jedes Modell.', 'Yksi sovellus. Jokainen malli.'],
  ['Ihre Dateien. Ihr PC.', 'Tiedostosi. Koneesi.'],
  ['Kein Abo.', 'Ei tilausta.'],
  ['Gratis-Credits', 'ilmaista saldoa'],
  ['Sprache wählen', 'Valitse kieli'],
  ['Über uns', 'Tietoja'],
  ['Menü öffnen', 'Avaa valikko'],
  ['oder', 'tai'],
  ['und', 'ja'],
  ['Schließen', 'Sulje'],
  ['Einstellungen', 'Asetukset'],
  ['Neuer Chat', 'Uusi keskustelu'],
  ['Neues Projekt', 'Uusi projekti'],
  ['Nachricht senden', 'Lähetä viesti'],
  ['Kopieren', 'Kopioi'],
  ['Löschen', 'Poista'],
  ['Erlauben', 'Salli'],
  ['Ablehnen', 'Estä'],
  ['Credits', 'saldoa'],
  ['Abonnement', 'tilausta'],
  ['Browser', 'selaimessa'],
  ['Herunterladen', 'Lataa'],
  ['Konto', 'Tili'],
  ['Produkt', 'Tuote'],
  ['Rechtliches', 'Oikeudellinen'],
  ['Datenschutz', 'Tietosuoja'],
  ['Nutzungsbedingungen', 'Käyttöehdot'],
];

const elPairs = [
  ['Modelle', 'Μοντέλα'],
  ['Desktop', 'Επιτραπέζιο'],
  ['Werkzeuge', 'Εργαλεία'],
  ['Preise', 'Τιμές'],
  ['Anmelden', 'Σύνδεση'],
  ['App öffnen', 'Άνοιγμα εφαρμογής'],
  ['Im Web nutzen', 'Χρήση στο web'],
  ['Download für', 'Λήψη για'],
  ['demnächst', 'σύντομα'],
  ['Desktop-App für', 'Εφαρμογή desktop για'],
  ['Eine App. Jedes Modell.', 'Μία εφαρμογή. Κάθε μοντέλο.'],
  ['Ihre Dateien. Ihr PC.', 'Τα αρχεία σας. Ο υπολογιστής σας.'],
  ['Kein Abo.', 'Χωρίς συνδρομή.'],
  ['Sprache wählen', 'Επιλογή γλώσσας'],
  ['Menü öffnen', 'Άνοιγμα μενού'],
  ['oder', 'ή'],
  ['und', 'και'],
  ['Schließen', 'Κλείσιμο'],
  ['Einstellungen', 'Ρυθμίσεις'],
  ['Neuer Chat', 'Νέα συνομιλία'],
  ['Neues Projekt', 'Νέο έργο'],
  ['Kopieren', 'Αντιγραφή'],
  ['Löschen', 'Διαγραφή'],
  ['Erlauben', 'Επιτρέπω'],
  ['Ablehnen', 'Απόρριψη'],
  ['Produkt', 'Προϊόν'],
  ['Konto', 'Λογαριασμός'],
  ['Rechtliches', 'Νομικά'],
  ['Datenschutz', 'Απόρρητο'],
  ['Nutzungsbedingungen', 'Όροι χρήσης'],
];

const huPairs = [
  ['Modelle', 'Modellek'],
  ['Desktop', 'Asztali'],
  ['Werkzeuge', 'Eszközök'],
  ['Preise', 'Árak'],
  ['Anmelden', 'Bejelentkezés'],
  ['App öffnen', 'Alkalmazás megnyitása'],
  ['Im Web nutzen', 'Használat a weben'],
  ['Download für', 'Letöltés'],
  ['demnächst', 'hamarosan'],
  ['Desktop-App für', 'Asztali alkalmazás'],
  ['Eine App. Jedes Modell.', 'Egy alkalmazás. Minden modell.'],
  ['Ihre Dateien. Ihr PC.', 'A fájlok. A géped.'],
  ['Kein Abo.', 'Nincs előfizetés.'],
  ['Sprache wählen', 'Nyelv kiválasztása'],
  ['Menü öffnen', 'Menü megnyitása'],
  ['oder', 'vagy'],
  ['und', 'és'],
  ['Schließen', 'Bezárás'],
  ['Einstellungen', 'Beállítások'],
  ['Neuer Chat', 'Új csevegés'],
  ['Neues Projekt', 'Új projekt'],
  ['Kopieren', 'Másolás'],
  ['Löschen', 'Törlés'],
  ['Erlauben', 'Engedélyezés'],
  ['Ablehnen', 'Elutasítás'],
  ['Produkt', 'Termék'],
  ['Konto', 'Fiók'],
  ['Rechtliches', 'Jogi'],
  ['Datenschutz', 'Adatvédelem'],
  ['Nutzungsbedingungen', 'Felhasználási feltételek'],
];

function mapObj(obj, pairs, partial) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    let t = partial[k] ?? v;
    for (const [a, b] of pairs) t = t.split(a).join(b);
    out[k] = t;
  }
  return out;
}

const nativeDir = path.join(__dirname, 'batch2-native');
const fi = mapObj(de, fiPairs, extractPartial('fi'));
fi.heroSubtitle =
  'Käytä Claudea, GPT:tä ja Geminiä yhdessä työpöytä- ja verkkosovelluksessa, suora pääsy tiedostoihisi, koodiin ja Gmailiin. Täytä lompakkoa 1 dollarista ja maksa jokaisesta pyynnöstä.';
fs.writeFileSync(path.join(nativeDir, 'fi.json'), JSON.stringify(fi, null, 2));
fs.writeFileSync(
  path.join(nativeDir, 'el.json'),
  JSON.stringify(mapObj(de, elPairs, extractPartial('el')), null, 2),
);
fs.writeFileSync(
  path.join(nativeDir, 'hu.json'),
  JSON.stringify(mapObj(de, huPairs, extractPartial('hu')), null, 2),
);
fs.copyFileSync(
  path.join(__dirname, 'batch2-overrides/uk.json'),
  path.join(nativeDir, 'uk.json'),
);
console.log('fi el hu uk native ready');
