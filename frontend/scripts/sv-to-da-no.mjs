import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sv = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'batch2-native/sv.json'), 'utf8'),
);

const daPairs = [
  ['Skrivbord', 'Desktop'],
  ['Logga in', 'Log ind'],
  ['Öppna appen', 'Åbn appen'],
  ['Använd på webben', 'Brug på nettet'],
  ['Ladda ner för', 'Download til'],
  ['kommer snart', 'kommer snart'],
  ['Skrivbordsapp för', 'Desktop-app til'],
  ['En app. Varje modell.', 'Én app. Alle modeller.'],
  ['Dina filer. Din dator.', 'Dine filer. Din computer.'],
  ['Ingen prenumeration.', 'Intet abonnement.'],
  ['gratis krediter', 'gratis kreditter'],
  ['när du registrerar dig', 'når du tilmelder dig'],
  ['Välj språk', 'Vælg sprog'],
  ['Öppna menyn', 'Åbn menuen'],
  ['och', 'og'],
  ['eller', 'eller'],
  ['Stäng', 'Luk'],
  ['Inställningar', 'Indstillinger'],
  ['Ny chatt', 'Ny chat'],
  ['Nytt projekt', 'Nyt projekt'],
  ['Skriv...', 'Skriv...'],
  ['Skicka meddelande', 'Send besked'],
  ['Kopiera', 'Kopiér'],
  ['Radera', 'Slet'],
  ['Tillåt', 'Tillad'],
  ['Neka', 'Afvis'],
  ['dina ', 'dine '],
  ['Dina ', 'Dine '],
  ['din ', 'din '],
  ['Din ', 'Din '],
  ['du ', 'du '],
  ['Du ', 'Du '],
  ['dig ', 'dig '],
  ['webbläsaren', 'browseren'],
  ['webben', 'nettet'],
  ['fakturor', 'fakturaer'],
  ['meddelande', 'besked'],
  ['meddelanden', 'beskeder'],
  ['mappar', 'mapper'],
  ['mappen', 'mappen'],
  ['krediter', 'kreditter'],
  ['anrop', 'opkald'],
  ['Prova', 'Prøv'],
  ['prova', 'prøv'],
  ['Fortsätt på webben', 'Fortsæt på nettet'],
];

const noPairs = [
  ['Skrivbord', 'Desktop'],
  ['Logga in', 'Logg inn'],
  ['Öppna appen', 'Åpne appen'],
  ['Använd på webben', 'Bruk på nettet'],
  ['Ladda ner för', 'Last ned for'],
  ['Skrivbordsapp för', 'Desktop-app for'],
  ['En app. Varje modell.', 'Én app. Alle modeller.'],
  ['Dina filer. Din dator.', 'Dine filer. Din maskin.'],
  ['Ingen prenumeration.', 'Ingen abonnement.'],
  ['gratis krediter', 'gratis kreditter'],
  ['när du registrerar dig', 'når du registrerer deg'],
  ['Välj språk', 'Velg språk'],
  ['Öppna menyn', 'Åpne menyen'],
  ['och', 'og'],
  ['Stäng', 'Lukk'],
  ['Inställningar', 'Innstillinger'],
  ['Ny chatt', 'Ny chat'],
  ['Nytt projekt', 'Nytt prosjekt'],
  ['Skicka meddelande', 'Send melding'],
  ['Radera', 'Slett'],
  ['Tillåt', 'Tillat'],
  ['Neka', 'Avslå'],
  ['dina ', 'dine '],
  ['Dina ', 'Dine '],
  ['webbläsaren', 'nettleseren'],
  ['webben', 'nettet'],
  ['fakturor', 'fakturaer'],
  ['meddelande', 'melding'],
  ['mappar', 'mapper'],
  ['krediter', 'kreditter'],
  ['anrop', 'anrop'],
  ['Prova', 'Prøv'],
  ['Fortsätt på webben', 'Fortsett på nettet'],
];

function mapObj(obj, pairs) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    let t = v;
    for (const [a, b] of pairs) t = t.split(a).join(b);
    out[k] = t;
  }
  return out;
}

const nativeDir = path.join(__dirname, 'batch2-native');
const da = mapObj(sv, daPairs);
da.desktopAppFor = 'Desktop-app til';
da.heroSubtitle =
  'Brug Claude, GPT og Gemini i én desktop- og webapp med direkte adgang til dine filer, kode og Gmail. Fyld din pung op fra 1 $ og betal per anmodning.';
da.heroCreditsNotice =
  '{credits} gratis kreditter, når du tilmelder dig. Fyld op i USD eller NGN, når du har brug for mere.';
da.privacyPolicy = 'Privatlivspolitik';
da.termsOfService = 'Servicevilkår';
da.legal = 'Juridisk';
da.about = 'Om';
da.downloadApp = 'Download appen';
da.downloadAppAria = 'Download AIGenius desktop-app';
da.featureModelsBody =
  'Vælg Claude, GPT, Gemini eller DeepSeek i beskedfeltet. Hvert svar viser, hvad det kostede.';
da.featureModelsHint = 'Prøv det: vælg en anden model.';
da.featureDesktopTitle = 'Kører på din maskine. Spørger, før den handler.';
da.featureDesktopBody =
  'Desktop-appen læser dine filer og kører kommandoer i dine projekter. Alt, der ændrer noget, venter på din godkendelse.';
da.featureToolsTitle = 'Læser dine PDF’er, søger på nettet, tjekker din indbakke.';
da.featureToolsBody =
  'Analyser rapporter, søg på nettet og forespørg din indbakke. Følsomme handlinger venter altid på din godkendelse.';
da.featurePricingTitle = 'Betal for det, du bruger. Intet andet.';
da.featurePricingBody =
  'Ingen månedlig plan. Fyld op, når du vil, og brug kreditter én besked ad gangen.';
da.startWithFreeCredits = 'Start med gratis kreditter';
da.finalCtaTitle = 'Start med {credits} gratis kreditter.';
da.finalCtaSubtitle =
  'Download appen eller åbn den i browseren. Der er intet abonnement at opsige.';
da.howItWorksTitle = 'Klar på et minut.';
da.step1Title = 'Åbn appen';
da.step1Body =
  'Download desktop-appen eller log ind på nettet. Du starter med {credits} gratis kreditter.';
da.step2Title = 'Vælg en model';
da.step2Body =
  'Vælg Claude, GPT, Gemini eller en anden model, og skift i næste besked.';
da.step3Title = 'Giv den arbejdet';
da.step3Body =
  'Chat, eller peg på dine filer, PDF’er og indbakke. Du betaler kun for de anmodninger, du sender.';
da.useCasesTitle = 'Giv den arbejdet, du helst vil undgå selv.';
da.seeItWork = 'Se det i aktion';
da.preview = 'Forhåndsvisning';
da.tasks = 'Opgaver';
da.faqTitle = 'Spørgsmål, besvaret.';
da.faqBillingQ = 'Hvordan fungerer fakturering?';
da.faqBillingA =
  'Du fylder en pung op fra 1 $ i USD eller NGN. Hver anmodning trækker sin egen pris baseret på den model, du valgte. Der er ingen månedlig plan.';
da.faqModelsQ = 'Hvilke modeller kan jeg bruge?';
da.faqModelsA =
  'Claude, GPT, Gemini, DeepSeek, Llama og flere via OpenRouter. Du kan skifte model i enhver besked.';
da.faqDesktopQ = 'Hvad kan desktop-appen få adgang til?';
da.faqDesktopA =
  'Dine lokale filer og projekter samt kommandoer, du godkender. Handlinger, der ændrer noget, venter først på din godkendelse.';
da.faqWebQ = 'Kan jeg bruge det uden at installere noget?';
da.faqWebA =
  'Ja. Log ind på nettet. Desktop-appen giver adgang til lokale filer og projekter.';
da.faqFreeQ = 'Hvad får jeg, når jeg tilmelder mig?';
da.faqFreeA = '{credits} gratis kreditter til at prøve, uden abonnement at opsige.';
da.footerTagline = 'Ét arbejdsområde for hver frontier-model. Betal for det, du bruger.';
da.connect = 'Forbind';
da.privacyChoices = 'Privatlivsvalg';
da.alsoFor = 'Også til';
da.skipToContent = 'Spring til indhold';
da.downloadStartingTitle = 'Din download starter snart.';
da.smartScreenTitle = 'Windows beskyttede din PC';
da.smartScreenDesc =
  'Microsoft Defender SmartScreen forhindrede en ukendt app i at starte. Det kan være risikabelt at køre appen.';
da.smartScreenMoreInfo = 'Mere info';
da.windowsIntro =
  'AIGenius er nyt, så Windows SmartScreen kan advare dig. Sådan åbner du den:';
da.windowsClickMoreInfo = 'Klik på Mere info.';
da.windowsClickRunAnyway = 'Klik på Kør alligevel.';
da.freeCreditsNotice = 'P.S. Du får {credits} gratis kreditter, når du tilmelder dig i appen.';

const no = mapObj(sv, noPairs);
no.desktopAppFor = 'Desktop-app for';
no.heroSubtitle =
  'Bruk Claude, GPT og Gemini i én desktop- og webapp med direkte tilgang til filene, koden og Gmail. Fyll lommeboken fra 1 $ og betal per forespørsel.';
no.heroCreditsNotice =
  '{credits} gratis kreditter når du registrerer deg. Fyll på i USD eller NGN når du trenger mer.';
no.privacyPolicy = 'Personvernerklæring';
no.termsOfService = 'Vilkår for bruk';
no.legal = 'Juridisk';
no.about = 'Om';
no.downloadApp = 'Last ned appen';
no.downloadAppAria = 'Last ned AIGenius desktop-app';
no.featureModelsBody =
  'Velg Claude, GPT, Gemini eller DeepSeek i meldingsfeltet. Hvert svar viser hva det kostet.';
no.featureModelsHint = 'Prøv: velg en annen modell.';
no.featureDesktopTitle = 'Kjører på maskinen din. Spør før den handler.';
no.featureDesktopBody =
  'Desktop-appen leser filene dine og kjører kommandoer i prosjektene dine. Alt som endrer noe, venter på godkjenningen din.';
no.featureToolsTitle = 'Leser PDF-ene dine, søker på nettet, sjekker innboksen.';
no.featureToolsBody =
  'Analyser rapporter, søk på nettet og spør innboksen din. Sensitive handlinger venter alltid på godkjenningen din.';
no.featurePricingTitle = 'Betal for det du bruker. Ikke noe annet.';
no.featurePricingBody =
  'Ingen månedlig plan. Fyll på når du vil og bruk kreditter én melding om gangen.';
no.startWithFreeCredits = 'Start med gratis kreditter';
no.finalCtaTitle = 'Start med {credits} gratis kreditter.';
no.finalCtaSubtitle =
  'Last ned appen eller åpne den i nettleseren. Det er ingen abonnement å avslutte.';
no.howItWorksTitle = 'Oppe på ett minutt.';
no.step1Title = 'Åpne appen';
no.step1Body =
  'Last ned desktop-appen eller logg inn på nettet. Du starter med {credits} gratis kreditter.';
no.step2Title = 'Velg en modell';
no.step2Body =
  'Velg Claude, GPT, Gemini eller en annen modell, og bytt i neste melding.';
no.step3Title = 'Gi den jobben';
no.step3Body =
  'Chat, eller pek på filene, PDF-ene og innboksen din. Du betaler bare for forespørslene du sender.';
no.useCasesTitle = 'Gi den jobben du helst vil slippe selv.';
no.seeItWork = 'Se hvordan det fungerer';
no.preview = 'Forhåndsvisning';
no.tasks = 'Oppgaver';
no.faqTitle = 'Spørsmål, besvart.';
no.faqBillingQ = 'Hvordan fungerer fakturering?';
no.faqBillingA =
  'Du fyller en lommebok fra 1 $ i USD eller NGN. Hver forespørsel trekker sin egen kostnad basert på modellen du valgte. Det er ingen månedlig plan.';
no.faqModelsQ = 'Hvilke modeller kan jeg bruke?';
no.faqModelsA =
  'Claude, GPT, Gemini, DeepSeek, Llama og flere via OpenRouter. Du kan bytte modell i hvilken som helst melding.';
no.faqDesktopQ = 'Hva kan desktop-appen få tilgang til?';
no.faqDesktopA =
  'Lokale filer og prosjekter, pluss kommandoer du godkjenner. Handlinger som endrer noe, venter først på godkjenningen din.';
no.faqWebQ = 'Kan jeg bruke det uten å installere noe?';
no.faqWebA =
  'Ja. Logg inn på nettet. Desktop-appen gir tilgang til lokale filer og prosjekter.';
no.faqFreeQ = 'Hva får jeg når jeg registrerer meg?';
no.faqFreeA = '{credits} gratis kreditter for å prøve, uten abonnement å avslutte.';
no.footerTagline = 'Én arbeidsflate for hver frontier-modell. Betal for det du bruker.';
no.connect = 'Koble til';
no.privacyChoices = 'Personvernvalg';
no.alsoFor = 'Også for';
no.skipToContent = 'Hopp til innhold';
no.downloadStartingTitle = 'Nedlastingen din starter snart.';
no.smartScreenTitle = 'Windows beskyttet PC-en din';
no.smartScreenDesc =
  'Microsoft Defender SmartScreen hindret en ukjent app i å starte. Det kan være risikabelt å kjøre appen.';
no.smartScreenMoreInfo = 'Mer info';
no.windowsIntro =
  'AIGenius er nytt, så Windows SmartScreen kan advare deg. Slik åpner du den:';
no.windowsClickMoreInfo = 'Klikk på Mer info.';
no.windowsClickRunAnyway = 'Klikk på Kjør likevel.';
no.freeCreditsNotice = 'P.S. Du får {credits} gratis kreditter når du registrerer deg i appen.';

fs.writeFileSync(path.join(nativeDir, 'da.json'), JSON.stringify(da, null, 2));
fs.writeFileSync(path.join(nativeDir, 'no.json'), JSON.stringify(no, null, 2));
console.log('wrote da, no from sv');
