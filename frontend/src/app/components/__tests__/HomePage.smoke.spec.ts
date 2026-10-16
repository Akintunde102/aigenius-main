/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';
import { translate, getDictionary } from '@/locales';

describe('HomePage smoke & localization', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'HomePage.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });

  it('translates all homepage sections in Spanish (es)', () => {
    expect(translate('es', 'landing.headline1')).toBe('Una aplicación. Todos los modelos.');
    expect(translate('es', 'landing.headline2')).toBe('Tus archivos. Tu máquina.');
    expect(translate('es', 'landing.featureModelsTitle')).toBe('Cambia de modelo a mitad de la conversación.');
    expect(translate('es', 'landing.featureDesktopTitle')).toBe('Funciona en tu equipo. Pide permiso antes de actuar.');
    expect(translate('es', 'landing.featureToolsTitle')).toBe('Lee tus PDF, busca en la web y revisa tu bandeja de entrada.');
    expect(translate('es', 'landing.featurePricingTitle')).toBe('Paga por lo que usas. Nada más.');
    expect(translate('es', 'landing.useCasesTitle')).toBe('Déjale el trabajo que preferirías no hacer.');
    expect(translate('es', 'landing.faqTitle')).toBe('Preguntas frecuentes resueltas.');
    expect(translate('es', 'landing.faqBillingQ')).toBe('¿Cómo funciona la facturación?');
    expect(translate('es', 'landing.footerTagline')).toBe('Un espacio de trabajo para cada modelo de frontera. Paga por lo que usas.');
    expect(translate('es', 'landing.downloadFor', '', { platform: 'Windows' })).toBe('Descargar para Windows');
  });

  it('translates all homepage sections in French (fr)', () => {
    expect(translate('fr', 'landing.headline1')).toBe('Une application. Tous les modèles.');
    expect(translate('fr', 'landing.featureModelsTitle')).toBe('Changez de modèle en cours de conversation.');
    expect(translate('fr', 'landing.useCasesTitle')).toBe('Confiez-lui les tâches que vous préférez éviter.');
    expect(translate('fr', 'landing.faqTitle')).toBe('Questions fréquentes résolues.');
  });

  it('translates all homepage sections and app demo in German (de)', () => {
    expect(translate('de', 'landing.headline1')).toBe('Eine App. Jedes Modell.');
    expect(translate('de', 'landing.headline2')).toBe('Ihre Dateien. Ihr PC.');
    expect(translate('de', 'landing.featureModelsTitle')).toBe('Modelle mitten im Gespräch wechseln.');
    expect(translate('de', 'landing.featureDesktopTitle')).toBe('Funktioniert direkt auf Ihrem Computer. Fragt vor jeder Aktion.');
    expect(translate('de', 'landing.featureToolsTitle')).toBe('Liest Ihre PDFs, durchsucht das Web, prüft Ihren Posteingang.');
    expect(translate('de', 'landing.featurePricingTitle')).toBe('Zahlen Sie nur für das, was Sie nutzen. Sonst nichts.');
    expect(translate('de', 'landing.useCasesTitle')).toBe('Überlassen Sie ihr die Aufgaben, die Sie lieber nicht selbst erledigen möchten.');
    expect(translate('de', 'landing.faqTitle')).toBe('Häufig gestellte Fragen, beantwortet.');
    expect(translate('de', 'landing.faqBillingQ')).toBe('Wie funktioniert die Abrechnung?');
    expect(translate('de', 'landing.footerTagline')).toBe('Ein Arbeitsbereich für jedes Spitzenmodell. Zahlen Sie nur, was Sie nutzen.');
    expect(translate('de', 'landing.downloadFor', '', { platform: 'Windows' })).toBe('Download für Windows');
    expect(translate('de', 'landing.demoToggleSidebar')).toBe('Seitenleiste umschalten');
    expect(translate('de', 'landing.demoNewChatAction')).toBe('Neuer Chat');
    expect(translate('de', 'landing.demoSearchConversations')).toBe('Unterhaltungen suchen');
    expect(translate('de', 'landing.demoChatFolderAnalysis')).toBe('Projektordner-Analyse');
    expect(translate('de', 'landing.demoTypePlaceholder')).toBe('Nachricht eingeben...');
    expect(translate('de', 'landing.demoWaitingApproval')).toBe('Wartet auf Ihre Zustimmung');
    expect(translate('de', 'landing.demoQuickPicks')).toBe('Schnellauswahl');
    expect(translate('de', 'landing.demoReplay')).toBe('Wiederholen');
    expect(translate('de', 'landing.demoTryOnWeb')).toBe('Im Web testen');
  });

  it('canonical English dictionary provides all landing keys', () => {
    const dict = getDictionary('en');
    expect(dict.landing.featureModelsTitle).toBe('Switch models mid-conversation.');
    expect(dict.landing.featureDesktopTitle).toBe('Works on your machine. Asks before it acts.');
    expect(dict.landing.featureToolsTitle).toBe('Reads your PDFs, searches the web, checks your inbox.');
    expect(dict.landing.featurePricingTitle).toBe('Pay for what you use. Nothing else.');
    expect(dict.landing.useCasesTitle).toBe('Hand it the work you would rather not do.');
    expect(dict.landing.faqTitle).toBe('Questions, answered.');
    expect(dict.landing.footerTagline).toBe('One workspace for every frontier model. Pay for what you use.');
    expect(dict.landing.skipToContent).toBe('Skip to content');
    expect(dict.landing.demoToggleSidebar).toBe('Toggle sidebar');
    expect(dict.landing.demoTypePlaceholder).toBe('Type...');
    expect(dict.landing.demoReplay).toBe('Replay');
  });
});
