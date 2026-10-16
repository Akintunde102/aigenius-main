/**
 * Rough NL → SV/DA/NO localization for landing overrides (better than raw NL).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nl = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing/nl.json'), 'utf8'),
);

const pairs = {
  sv: [
    ['Modellen', 'Modeller'],
    ['Inloggen', 'Logga in'],
    ['App openen', 'Öppna appen'],
    ['Gebruik op het web', 'Använd på webben'],
    ['Downloaden voor', 'Ladda ner för'],
    ['binnenkort beschikbaar', 'kommer snart'],
    ['Desktop-app voor', 'Skrivbordsapp för'],
    ['Eén app. Elk model.', 'En app. Varje modell.'],
    ['Jouw bestanden. Jouw machine.', 'Dina filer. Din dator.'],
    ['Geen abonnement.', 'Ingen prenumeration.'],
    ['gratis tegoed', 'gratis krediter'],
    ['bij aanmelding', 'när du registrerar dig'],
    ['Selecteer taal', 'Välj språk'],
    ['Gepubliceerde gesprekken', 'Publicerade konversationer'],
    ["Gepubliceerde pagina's", 'Publicerade sidor'],
    ['Menu openen', 'Öppna menyn'],
    ['Bekijk het in actie', 'Se det i praktiken'],
    ['Voorbeeld', 'Förhandsvisning'],
    ['Taken', 'Uppgifter'],
    ['Vragen, beantwoord.', 'Frågor, besvarade.'],
    ['Naar inhoud springen', 'Hoppa till innehåll'],
    ['Meer info', 'Mer info'],
    ['Sluiten', 'Stäng'],
    ['Nieuwe chat', 'Ny chatt'],
    ['Nieuw project', 'Nytt projekt'],
    ['Instellingen', 'Inställningar'],
    ['Typen...', 'Skriv...'],
    ['Bericht verzenden', 'Skicka meddelande'],
    ['Kopiëren', 'Kopiera'],
    ['Verwijderen', 'Radera'],
    ['Toestaan', 'Tillåt'],
    ['Weigeren', 'Neka'],
    ['Opnieuw afspelen', 'Spela upp igen'],
    ['Probeer op het web', 'Prova på webben'],
    ['tegoed', 'krediter'],
    ['oproepen', 'anrop'],
    ['bericht', 'meddelande'],
    ['mappen', 'mappar'],
    ['bestanden', 'filer'],
    ['gesprekken', 'konversationer'],
    ['je ', 'du '],
    ['Je ', 'Du '],
    ['jouw ', 'din '],
    ['Jouw ', 'Din '],
    ['wilt', 'vill'],
    ['Wanneer', 'När'],
    ['wanneer', 'när'],
    ['binnen', 'inom'],
    ['Binnen', 'Inom'],
  ],
  da: [
    ['Modellen', 'Modeller'],
    ['Inloggen', 'Log ind'],
    ['App openen', 'Åbn app'],
    ['Gebruik op het web', 'Brug på nettet'],
    ['Downloaden voor', 'Download til'],
    ['binnenkort beschikbaar', 'kommer snart'],
    ['Desktop-app voor', 'Desktop-app til'],
    ['Eén app. Elk model.', 'Én app. Alle modeller.'],
    ['Jouw bestanden. Jouw machine.', 'Dine filer. Din maskine.'],
    ['Geen abonnement.', 'Intet abonnement.'],
    ['gratis tegoed', 'gratis kreditter'],
    ['Selecteer taal', 'Vælg sprog'],
    ['Gepubliceerde gesprekken', 'Udgivne samtaler'],
    ["Gepubliceerde pagina's", 'Udgivne sider'],
    ['Menu openen', 'Åbn menu'],
    ['Sluiten', 'Luk'],
    ['Nieuwe chat', 'Ny chat'],
    ['Nieuw project', 'Nyt projekt'],
    ['Instellingen', 'Indstillinger'],
    ['Typen...', 'Skriv...'],
    ['je ', 'du '],
    ['Je ', 'Du '],
    ['jouw ', 'din '],
    ['Jouw ', 'Din '],
  ],
  no: [
    ['Modellen', 'Modeller'],
    ['Inloggen', 'Logg inn'],
    ['App openen', 'Åpne app'],
    ['Gebruik op het web', 'Bruk på nettet'],
    ['Downloaden voor', 'Last ned for'],
    ['binnenkort beschikbaar', 'kommer snart'],
    ['Desktop-app voor', 'Desktop-app for'],
    ['Eén app. Elk model.', 'Én app. Alle modeller.'],
    ['Jouw bestanden. Jouw machine.', 'Dine filer. Din maskin.'],
    ['Geen abonnement.', 'Ingen abonnement.'],
    ['gratis tegoed', 'gratis kreditter'],
    ['Selecteer taal', 'Velg språk'],
    ['Gepubliceerde gesprekken', 'Publiserte samtaler'],
    ["Gepubliceerde pagina's", 'Publiserte sider'],
    ['Menu openen', 'Åpne meny'],
    ['Sluiten', 'Lukk'],
    ['Nieuwe chat', 'Ny chat'],
    ['Nieuw project', 'Nytt prosjekt'],
    ['Instellingen', 'Innstillinger'],
    ['Typen...', 'Skriv...'],
    ['je ', 'du '],
    ['Je ', 'Du '],
    ['jouw ', 'din '],
    ['Jouw ', 'Din '],
  ],
};

function applyPairs(text, list) {
  let out = text;
  for (const [from, to] of list) {
    out = out.split(from).join(to);
  }
  return out;
}

const outDir = path.join(__dirname, 'batch2-overrides');
for (const [mod, list] of Object.entries(pairs)) {
  const landing = {};
  for (const [k, v] of Object.entries(nl)) {
    landing[k] = applyPairs(v, list);
  }
  fs.writeFileSync(path.join(outDir, `${mod}.json`), JSON.stringify(landing, null, 2), 'utf8');
  console.log('localized', mod);
}
