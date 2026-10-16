import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageProvider, useLanguage } from '@/lib/providers/LanguageProvider';
import { preloadAllDictionaries } from '@/locales';
import { FeatureRows } from '../FeatureRows';
import { UseCases, Faq } from '../Closing';
import { SiteFooter } from '../SiteFooter';
import { DownloadCta } from '../DownloadCta';
import { DownloadInstructionModal } from '../DownloadInstructionModal';
import { SiteHeader } from '../SiteHeader';

// Mock framer-motion to simplify DOM output
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileInView, initial, animate, transition, exit, viewport, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, whileInView, initial, animate, transition, exit, viewport, ...props }: any) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useScroll: () => ({ scrollY: { on: () => () => {} } }),
  useMotionValueEvent: () => {},
  useReducedMotion: () => false,
  useTransform: () => 0,
}));

// Mock preview island components inside FeatureRows to keep test fast and focused on copy
jest.mock('../ModelSwitchPreview', () => ({
  ModelSwitchPreview: () => <div data-testid="model-switch-preview" />,
}));
jest.mock('../DesktopDemo', () => ({
  DesktopDemo: () => <div data-testid="desktop-demo" />,
}));
jest.mock('../ToolsDemo', () => ({
  ToolsDemo: () => <div data-testid="tools-demo" />,
}));
jest.mock('../WalletDemo', () => ({
  WalletDemo: () => <div data-testid="wallet-demo" />,
}));
jest.mock('../UseCaseDemo', () => ({
  UseCaseDemo: () => <div data-testid="use-case-demo" />,
}));

function setupLocale(code: string) {
  localStorage.setItem('aigenius_locale', code);
  document.cookie = `aigenius_locale=${code}; path=/`;
}

describe('Homepage localization across all sections', () => {
  beforeAll(async () => {
    await preloadAllDictionaries();
    HTMLDialogElement.prototype.showModal = jest.fn(function (this: any) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = jest.fn(function (this: any) {
      this.open = false;
    });
  });

  beforeEach(() => {
    localStorage.clear();
    document.cookie = '';
  });

  describe('FeatureRows component', () => {
    it('renders all 4 feature cards in English by default', () => {
      setupLocale('en');
      render(
        <LanguageProvider>
          <FeatureRows />
        </LanguageProvider>,
      );

      expect(screen.getByText('Switch models mid-conversation.')).toBeInTheDocument();
      expect(
        screen.getByText('Pick Claude, GPT, Gemini or DeepSeek from the message box. Every reply shows what it cost.'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Try it on the web/i)).toBeInTheDocument();

      expect(screen.getByText('Works on your machine. Asks before it acts.')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The desktop app reads your files and runs commands in your projects. Anything that changes something waits for your approval.',
        ),
      ).toBeInTheDocument();

      expect(screen.getByText('Reads your PDFs, searches the web, checks your inbox.')).toBeInTheDocument();
      expect(screen.getByText('Pay for what you use. Nothing else.')).toBeInTheDocument();
      expect(screen.getByText(/Start with free credits/i)).toBeInTheDocument();
    });

    it('translates all 4 feature cards in Spanish (es)', () => {
      setupLocale('es');
      render(
        <LanguageProvider>
          <FeatureRows />
        </LanguageProvider>,
      );

      expect(screen.getByText('Cambia de modelo a mitad de la conversación.')).toBeInTheDocument();
      expect(
        screen.getByText('Elige Claude, GPT, Gemini o DeepSeek desde el cuadro de mensajes. Cada respuesta muestra su coste.'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Pruébalo en la web/i)).toBeInTheDocument();

      expect(screen.getByText('Funciona en tu equipo. Pide permiso antes de actuar.')).toBeInTheDocument();
      expect(
        screen.getByText(
          'La app de escritorio lee tus archivos y ejecuta comandos en tus proyectos. Cualquier cambio espera tu aprobación.',
        ),
      ).toBeInTheDocument();

      expect(screen.getByText('Lee tus PDF, busca en la web y revisa tu bandeja de entrada.')).toBeInTheDocument();
      expect(screen.getByText('Paga por lo que usas. Nada más.')).toBeInTheDocument();
      expect(screen.getByText(/Comienza con créditos gratis/i)).toBeInTheDocument();
    });

    it('translates all 4 feature cards in French (fr)', () => {
      setupLocale('fr');
      render(
        <LanguageProvider>
          <FeatureRows />
        </LanguageProvider>,
      );

      expect(screen.getByText('Changez de modèle en cours de conversation.')).toBeInTheDocument();
      expect(screen.getByText('Fonctionne sur votre machine. Demande avant d’agir.')).toBeInTheDocument();
      expect(screen.getByText('Lit vos PDF, cherche sur le web, consulte vos e-mails.')).toBeInTheDocument();
      expect(screen.getByText('Payez ce que vous consommez. Rien d’autre.')).toBeInTheDocument();
      expect(screen.getByText(/Commencer avec des crédits gratuits/i)).toBeInTheDocument();
    });

    it('translates all 4 feature cards in Yoruba (yo)', () => {
      setupLocale('yo');
      render(
        <LanguageProvider>
          <FeatureRows />
        </LanguageProvider>,
      );

      expect(screen.getByText('Pààrọ̀ àwọn àwòṣe ní àárín ìfọ̀rọ̀wérọ̀.')).toBeInTheDocument();
      expect(
        screen.getByText('Yan Claude, GPT, Gemini tàbí DeepSeek látinú àpótí ìfiránṣẹ́. Ìdáhùn kọ̀ọ̀kan ń fi iye owó rẹ̀ hàn.'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Dán an wò lórí wẹ́ẹ̀bù/i)).toBeInTheDocument();

      expect(screen.getByText('Ó ń ṣiṣẹ́ lórí ẹ̀rọ rẹ. Ó ń béèrè kí ó tó gbé ìgbésẹ̀.')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Áàpù ojú-iṣẹ́ ń ka àwọn fáìlì rẹ tí ó sì ń ṣe àwọn àṣẹ nínú àwọn iṣẹ́ àkànṣe rẹ. Ohunkóhun tí yóò yí nǹkan padà ń dúró de ìfọwọ́sí rẹ.',
        ),
      ).toBeInTheDocument();

      expect(screen.getByText('Ó ń ka àwọn PDF rẹ, ń wá lórí wẹ́ẹ̀bù, ń yẹ àpótí ìwọlé rẹ wò.')).toBeInTheDocument();
      expect(screen.getByText('San owó fún ohun tí o lò nìkan. Kò sí nǹkan mìíràn.')).toBeInTheDocument();
      expect(screen.getByText(/Bẹ̀rẹ̀ pẹ̀lú àwọn kírẹ́dìtì ọ̀fẹ́/i)).toBeInTheDocument();
    });
  });

  describe('UseCases & UseCaseGrid component', () => {
    it('renders heading and all 10 use case items in English', () => {
      setupLocale('en');
      render(
        <LanguageProvider>
          <UseCases />
        </LanguageProvider>,
      );

      expect(screen.getByText('Hand it the work you would rather not do.')).toBeInTheDocument();
      expect(screen.getByText('Draft client proposals in seconds')).toBeInTheDocument();
      expect(screen.getByText('Build a website directly on your PC')).toBeInTheDocument();
      expect(screen.getByText('Update Excel sheets without knowing Excel')).toBeInTheDocument();
      expect(screen.getByText('Organize project files and folders')).toBeInTheDocument();
      expect(screen.getByText('Research a topic in depth')).toBeInTheDocument();
      expect(screen.getByText('Turn messy meeting notes into clear actions')).toBeInTheDocument();
      expect(screen.getByText('Write and debug code without the headache')).toBeInTheDocument();
      expect(screen.getByText('Summarize 100-page PDF reports')).toBeInTheDocument();
      expect(screen.getByText('Find the answer buried in a long PDF')).toBeInTheDocument();
      expect(screen.getByText('Analyze complex data in plain English')).toBeInTheDocument();
    });

    it('translates heading and all 10 use case items in Spanish (es)', () => {
      setupLocale('es');
      render(
        <LanguageProvider>
          <UseCases />
        </LanguageProvider>,
      );

      expect(screen.getByText('Déjale el trabajo que preferirías no hacer.')).toBeInTheDocument();
      expect(screen.getByText('Redacta propuestas para clientes en segundos')).toBeInTheDocument();
      expect(screen.getByText('Crea una web directamente en tu PC')).toBeInTheDocument();
      expect(screen.getByText('Actualiza hojas de Excel sin saber de Excel')).toBeInTheDocument();
      expect(screen.getByText('Organiza archivos y carpetas de proyectos')).toBeInTheDocument();
      expect(screen.getByText('Investiga un tema en profundidad')).toBeInTheDocument();
      expect(screen.getByText('Convierte notas desordenadas en acciones claras')).toBeInTheDocument();
      expect(screen.getByText('Escribe y depura código sin dolores de cabeza')).toBeInTheDocument();
      expect(screen.getByText('Resume informes PDF de 100 páginas')).toBeInTheDocument();
      expect(screen.getByText('Encuentra la respuesta oculta en un PDF largo')).toBeInTheDocument();
      expect(screen.getByText('Analiza datos complejos en lenguaje sencillo')).toBeInTheDocument();
    });

    it('translates heading and use cases in French (fr)', () => {
      setupLocale('fr');
      render(
        <LanguageProvider>
          <UseCases />
        </LanguageProvider>,
      );

      expect(screen.getByText('Confiez-lui les tâches que vous préférez éviter.')).toBeInTheDocument();
      expect(screen.getByText('Rédigez des propositions clients en quelques secondes')).toBeInTheDocument();
      expect(screen.getByText('Créez un site web directement sur votre PC')).toBeInTheDocument();
    });

    it('translates heading and use cases in Yoruba (yo)', () => {
      setupLocale('yo');
      render(
        <LanguageProvider>
          <UseCases />
        </LanguageProvider>,
      );

      expect(screen.getByText('Fún un ní iṣẹ́ tí o kò fẹ́ ṣe fúnra rẹ.')).toBeInTheDocument();
      expect(screen.getByText('Kọ àwọn àbá fún oníbàárà láàárín ìṣẹ́jú-àáyá')).toBeInTheDocument();
      expect(screen.getByText('Kọ́ ojú-ewé wẹ́ẹ̀bù tààrà lórí kọ̀mpútà rẹ')).toBeInTheDocument();
    });
  });

  describe('FAQ section', () => {
    it('renders heading and questions/answers in English', () => {
      setupLocale('en');
      render(
        <LanguageProvider>
          <Faq />
        </LanguageProvider>,
      );

      expect(screen.getByText('Questions, answered.')).toBeInTheDocument();
      expect(screen.getByText('How does billing work?')).toBeInTheDocument();
      expect(screen.getByText(/You top up a wallet from \$1/i)).toBeInTheDocument();
      expect(screen.getByText('Which models can I use?')).toBeInTheDocument();
      expect(screen.getByText('What can the desktop app access?')).toBeInTheDocument();
      expect(screen.getByText('Can I use it without installing anything?')).toBeInTheDocument();
      expect(screen.getByText('What do I get when I sign up?')).toBeInTheDocument();
    });

    it('translates heading and questions/answers in Spanish (es)', () => {
      setupLocale('es');
      render(
        <LanguageProvider>
          <Faq />
        </LanguageProvider>,
      );

      expect(screen.getByText('Preguntas frecuentes resueltas.')).toBeInTheDocument();
      expect(screen.getByText('¿Cómo funciona la facturación?')).toBeInTheDocument();
      expect(screen.getByText(/Recargas tu saldo desde 1 \$/i)).toBeInTheDocument();
      expect(screen.getByText('¿Qué modelos puedo usar?')).toBeInTheDocument();
      expect(screen.getByText('¿A qué tiene acceso la aplicación de escritorio?')).toBeInTheDocument();
      expect(screen.getByText('¿Puedo usarlo sin instalar nada?')).toBeInTheDocument();
      expect(screen.getByText('¿Qué recibo al registrarme?')).toBeInTheDocument();
    });

    it('translates heading and questions in French (fr)', () => {
      setupLocale('fr');
      render(
        <LanguageProvider>
          <Faq />
        </LanguageProvider>,
      );

      expect(screen.getByText('Questions fréquentes résolues.')).toBeInTheDocument();
      expect(screen.getByText('Comment fonctionne la facturation ?')).toBeInTheDocument();
      expect(screen.getByText('Quels modèles puis-je utiliser ?')).toBeInTheDocument();
      expect(screen.getByText('À quoi l’application de bureau a-t-elle accès ?')).toBeInTheDocument();
    });

    it('translates heading and questions in Yoruba (yo)', () => {
      setupLocale('yo');
      render(
        <LanguageProvider>
          <Faq />
        </LanguageProvider>,
      );

      expect(screen.getByText('Àwọn ìbéèrè àti ìdáhùn.')).toBeInTheDocument();
      expect(screen.getByText('Báwo ni sísan owó ṣe ń ṣiṣẹ́?')).toBeInTheDocument();
      expect(screen.getByText('Àwọn àwòṣe wo ni mo lè lò?')).toBeInTheDocument();
      expect(screen.getByText('Kí ni áàpù ojú-iṣẹ́ lè wọlé sí?')).toBeInTheDocument();
    });
  });

  describe('SiteFooter component', () => {
    it('renders tagline, columns, and legal text in English', () => {
      setupLocale('en');
      render(
        <LanguageProvider>
          <SiteFooter />
        </LanguageProvider>,
      );

      expect(screen.getByText('One workspace for every frontier model. Pay for what you use.')).toBeInTheDocument();
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
      expect(screen.getByText('Privacy choices')).toBeInTheDocument();
    });

    it('translates tagline, columns, and legal text in Spanish (es)', () => {
      setupLocale('es');
      render(
        <LanguageProvider>
          <SiteFooter />
        </LanguageProvider>,
      );

      expect(screen.getByText('Un espacio de trabajo para cada modelo de frontera. Paga por lo que usas.')).toBeInTheDocument();
      expect(screen.getByText('Producto')).toBeInTheDocument();
      expect(screen.getByText('Cuenta')).toBeInTheDocument();
      expect(screen.getByText('Opciones de privacidad')).toBeInTheDocument();
    });

    it('translates tagline, columns, and legal text in French (fr)', () => {
      setupLocale('fr');
      render(
        <LanguageProvider>
          <SiteFooter />
        </LanguageProvider>,
      );

      expect(screen.getByText('Un espace de travail pour chaque modèle frontière. Payez ce que vous consommez.')).toBeInTheDocument();
      expect(screen.getByText('Produit')).toBeInTheDocument();
      expect(screen.getByText('Compte')).toBeInTheDocument();
      expect(screen.getByText('Mentions légales')).toBeInTheDocument();
      expect(screen.getByText('Choix de confidentialité')).toBeInTheDocument();
    });

    it('translates tagline, columns, and legal text in Yoruba (yo)', () => {
      setupLocale('yo');
      render(
        <LanguageProvider>
          <SiteFooter />
        </LanguageProvider>,
      );

      expect(screen.getByText('Ibì iṣẹ́ kan ṣoṣo fún gbogbo àwòṣe ààrin ìṣáájú. San owó fún ohun tí o lò nìkan.')).toBeInTheDocument();
      expect(screen.getByText('Ọjà')).toBeInTheDocument();
      expect(screen.getByText('Àkántì')).toBeInTheDocument();
      expect(screen.getByText('Òfin')).toBeInTheDocument();
      expect(screen.getByText('Ìsopọ̀')).toBeInTheDocument();
    });
  });

  describe('SiteHeader component', () => {
    it('translates header nav and CTA buttons in English by default', () => {
      setupLocale('en');
      render(
        <LanguageProvider>
          <SiteHeader initialPlatform="windows" />
        </LanguageProvider>,
      );

      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('Published conversations')).toBeInTheDocument();
      expect(screen.getByText('Published pages')).toBeInTheDocument();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('translates all header nav links and buttons in Yoruba (yo)', () => {
      setupLocale('yo');
      render(
        <LanguageProvider>
          <SiteHeader initialPlatform="windows" />
        </LanguageProvider>,
      );

      expect(screen.getByText('Iye owó')).toBeInTheDocument();
      expect(screen.getByText('Àwọn ìfọ̀rọ̀wérọ̀ tí a tẹ̀jáde')).toBeInTheDocument();
      expect(screen.getByText('Àwọn ojú-ewé tí a tẹ̀jáde')).toBeInTheDocument();
      expect(screen.getByText('Wọlé')).toBeInTheDocument();
    });
  });

  describe('DownloadInstructionModal component', () => {
    it('translates modal title and SmartScreen hint in Spanish (es)', () => {
      setupLocale('es');
      render(
        <LanguageProvider>
          <DownloadInstructionModal platform="windows" onClose={() => {}} />
        </LanguageProvider>,
      );

      expect(screen.getByText('Tu descarga comenzará en breve.')).toBeInTheDocument();
      expect(screen.getByText('Windows protegió tu PC')).toBeInTheDocument();
      expect(screen.getByText('Más información')).toBeInTheDocument();
      expect(screen.getByText(/Obtienes 100 créditos gratis al registrarte/i)).toBeInTheDocument();
    });
  });

  describe('Dynamic language switching in real-time', () => {
    function SwitcherTestHarness() {
      const { language, setLanguage } = useLanguage();
      return (
        <div>
          <button data-testid="switch-to-es" onClick={() => setLanguage('es')}>
            Switch to Spanish
          </button>
          <button data-testid="switch-to-fr" onClick={() => setLanguage('fr')}>
            Switch to French
          </button>
          <button data-testid="switch-to-yo" onClick={() => setLanguage('yo')}>
            Switch to Yoruba
          </button>
          <span data-testid="current-lang">{language}</span>
          <FeatureRows />
          <UseCases />
          <Faq />
          <SiteFooter />
        </div>
      );
    }

    it('reactively switches all homepage content when language is changed', () => {
      setupLocale('en');
      render(
        <LanguageProvider>
          <SwitcherTestHarness />
        </LanguageProvider>,
      );

      // Initially in English
      expect(screen.getByText('Switch models mid-conversation.')).toBeInTheDocument();
      expect(screen.getByText('Hand it the work you would rather not do.')).toBeInTheDocument();
      expect(screen.getByText('Questions, answered.')).toBeInTheDocument();

      // Click switch to Spanish
      act(() => {
        fireEvent.click(screen.getByTestId('switch-to-es'));
      });

      // Assert DOM immediately switches to Spanish
      expect(screen.getByText('Cambia de modelo a mitad de la conversación.')).toBeInTheDocument();
      expect(screen.getByText('Déjale el trabajo que preferirías no hacer.')).toBeInTheDocument();
      expect(screen.getByText('Preguntas frecuentes resueltas.')).toBeInTheDocument();
      expect(screen.getByText('Un espacio de trabajo para cada modelo de frontera. Paga por lo que usas.')).toBeInTheDocument();

      // Click switch to French
      act(() => {
        fireEvent.click(screen.getByTestId('switch-to-fr'));
      });

      // Assert DOM immediately switches to French
      expect(screen.getByText('Changez de modèle en cours de conversation.')).toBeInTheDocument();
      expect(screen.getByText('Confiez-lui les tâches que vous préférez éviter.')).toBeInTheDocument();
      expect(screen.getByText('Questions fréquentes résolues.')).toBeInTheDocument();

      // Click switch to Yoruba
      act(() => {
        fireEvent.click(screen.getByTestId('switch-to-yo'));
      });

      // Assert DOM immediately switches to Yoruba
      expect(screen.getByText('Pààrọ̀ àwọn àwòṣe ní àárín ìfọ̀rọ̀wérọ̀.')).toBeInTheDocument();
      expect(screen.getByText('Fún un ní iṣẹ́ tí o kò fẹ́ ṣe fúnra rẹ.')).toBeInTheDocument();
      expect(screen.getByText('Àwọn ìbéèrè àti ìdáhùn.')).toBeInTheDocument();
      expect(
        screen.getByText('Ibì iṣẹ́ kan ṣoṣo fún gbogbo àwòṣe ààrin ìṣáájú. San owó fún ohun tí o lò nìkan.'),
      ).toBeInTheDocument();
    });
  });
});
