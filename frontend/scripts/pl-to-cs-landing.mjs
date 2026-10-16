import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pl = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing/pl.json'), 'utf8'),
);
const csSrc = fs.readFileSync(path.join(__dirname, '../src/locales/dictionaries/cs.ts'), 'utf8');
const m = csSrc.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
const csPartial = {};
if (m) {
  for (const line of m[1].split('\n')) {
    const single = line.match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (single) csPartial[single[1]] = single[2].replace(/\\'/g, "'");
  }
}

const pairs = [
  ['Zmieniaj', 'Přepínej'],
  ['modele', 'modely'],
  ['rozmowy', 'konverzaci'],
  ['Wybierz', 'Vyberte'],
  ['z pola', 'z pole'],
  ['wiadomości', 'zprávy'],
  ['Każda', 'Každá'],
  ['odpowiedź', 'odpověď'],
  ['pokazuje', 'ukazuje'],
  ['koszt', 'cenu'],
  ['Pobierz', 'Stáhněte'],
  ['aplikację', 'aplikaci'],
  ['Zaloguj', 'Přihlaste'],
  ['Konto', 'Účet'],
  ['Polityka', 'Zásady'],
  ['prywatności', 'ochrany osobních údajů'],
  ['Regulamin', 'Podmínky'],
  ['usługi', 'služby'],
  ['Wybierz język', 'Vyberte jazyk'],
  ['O nas', 'O nás'],
  ['Opublikowane', 'Publikované'],
  ['rozmowy', 'konverzace'],
  ['strony', 'stránky'],
  ['Wkrótce', 'Již brzy'],
  ['Otwórz', 'Otevřete'],
  ['menu', 'nabídku'],
  ['bez', 'bez'],
  ['abonamentu', 'předplatného'],
  ['darmowych', 'zdarma'],
  ['kredytów', 'kreditů'],
  ['po rejestracji', 'při registraci'],
  ['Doładuj', 'Dobijte'],
  ['gdy', 'když'],
  ['potrzebujesz', 'budete potřebovat'],
  ['więcej', 'více'],
  ['lub', 'nebo'],
  ['i ', 'a '],
  ['Nie', 'Ne'],
  ['Tak', 'Ano'],
  ['Szukaj', 'Hledat'],
  ['Ustawienia', 'Nastavení'],
  ['Nowa', 'Nový'],
  ['rozmowa', 'chat'],
  ['projekt', 'projekt'],
  ['Zamknij', 'Zavřít'],
  ['Kopiuj', 'Kopírovat'],
  ['Usuń', 'Smazat'],
  ['Zezwól', 'Povolit'],
  ['Odmów', 'Zamítnout'],
  ['plików', 'souborů'],
  ['folderów', 'složek'],
  ['faktur', 'faktur'],
  ['wiadomość', 'zprávu'],
  ['wiadomości', 'zprávy'],
  ['miesięczny', 'měsíční'],
  ['miesięcznego', 'měsíčního'],
  ['przeglądarki', 'prohlížeče'],
  ['przeglądarce', 'prohlížeči'],
  ['aplikacji', 'aplikaci'],
  ['komputera', 'počítače'],
  ['Pulpit', 'Počítač'],
  ['Narzędzia', 'Nástroje'],
  ['Cennik', 'Ceník'],
  ['Zaloguj się', 'Přihlásit se'],
  ['Otwórz aplikację', 'Otevřít aplikaci'],
  ['Użyj w przeglądarce', 'Použít na webu'],
  ['Pobierz dla', 'Stáhnout pro'],
  ['już wkrótce', 'již brzy'],
  ['Aplikacja desktopowa dla', 'Počítačová aplikace pro'],
];

function toCs(text) {
  let out = text;
  for (const [a, b] of pairs) out = out.split(a).join(b);
  return out;
}

const landing = {};
for (const [k, v] of Object.entries(pl)) {
  landing[k] = csPartial[k] ?? toCs(v);
}

fs.writeFileSync(
  path.join(__dirname, 'batch2-native/cs.json'),
  JSON.stringify(landing, null, 2),
  'utf8',
);
console.log('cs', Object.keys(landing).length);
