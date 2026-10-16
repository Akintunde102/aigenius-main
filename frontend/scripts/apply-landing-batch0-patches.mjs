/**
 * Batch 0: fix folder-analysis demo strings (es/fr/de) and complete zh/zh-tw tails.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../src/locales/data/landing');

const faDetail =
  'api-gateway/\\nmarketing-site/\\ninvoices-2025/\\nmobile-app/\\nnotes/\\nold-experiments/\\n... 17 more';

const suggestEs = {
  demoSuggestContract: 'Resume este contrato y señala cualquier aspecto riesgoso',
  demoSuggestProposal: 'Redacta una propuesta para un nuevo cliente',
  demoSuggestCompetitors: '¿Cuánto cobran mis competidores?',
  demoSuggestInvoices: '¿Qué facturas están vencidas?',
};

const faEs = {
  demoFaUserPrompt: 'Analiza mis carpetas de proyecto con subagentes en paralelo',
  demoFaThought:
    'Primero lista la carpeta y reparte el análisis entre subagentes para que cada uno lea unas carpetas en paralelo. Todo permanece en solo lectura.',
  demoFaTool1Label: 'Proyectos listados',
  demoFaTool1Detail: faDetail,
  demoFaP2:
    'Voy a obtener una lista limpia solo de las carpetas para delegar el análisis en paralelo.',
  demoFaTool2Label: 'local_shell',
  demoFaP3Part1: 'Tu carpeta Projects tiene ',
  demoFaP3Bold: '23 carpetas',
  demoFaTool3Label: '6 subagentes',
  demoFaTool3Detail: '6 de 6 terminaron. Solo lectura: no se modificó ningún archivo.',
  demoFaP4:
    'Los 6 subagentes terminaron (23 carpetas analizadas, solo lectura). Aquí está el análisis combinado.',
  demoFaHeading: 'Análisis de carpetas del proyecto — 23 carpetas',
  demoFaSnapshot: 'Resumen',
  demoFaThCategory: 'Categoría',
  demoFaThFolders: 'Carpetas',
  demoFaThVerdict: 'Veredicto',
  demoFaRowActive: 'Proyectos de código activos',
  demoFaRowKeep: 'Conservar',
  demoFaRowFinished: 'Proyectos finalizados',
  demoFaRowArchiveConfirmed: 'Archivar cuando se confirme',
  demoFaRowDocuments: 'Documentos, notas y multimedia',
  demoFaRowTidy: 'Ordenar o archivar',
  demoFaRowEmpty: 'Carpetas vacías',
  demoFaRowDelete: 'Eliminar',
  demoFaRowDormant: 'Proyectos únicos inactivos',
  demoFaRowArchive: 'Archivar',
};

const suggestFr = {
  demoSuggestContract: 'Résumez ce contrat et signalez tout élément à risque',
  demoSuggestProposal: 'Rédigez une proposition pour un nouveau client',
  demoSuggestCompetitors: 'Que facturent mes concurrents ?',
  demoSuggestInvoices: 'Quelles factures sont en retard ?',
};

const faFr = {
  demoFaUserPrompt: 'Analyse mes dossiers de projet avec des sous-agents en parallèle',
  demoFaThought:
    'Lister d’abord le dossier, puis répartir l’analyse entre sous-agents pour que chacun lise quelques dossiers en parallèle. Tout reste en lecture seule.',
  demoFaTool1Label: 'Projets listés',
  demoFaTool1Detail: faDetail.replace('more', 'de plus'),
  demoFaP2:
    'Je vais obtenir une liste claire des dossiers uniquement pour déléguer l’analyse en parallèle.',
  demoFaTool2Label: 'local_shell',
  demoFaP3Part1: 'Votre dossier Projects contient ',
  demoFaP3Bold: '23 dossiers',
  demoFaTool3Label: '6 sous-agents',
  demoFaTool3Detail: '6 sur 6 terminés. Lecture seule : aucun fichier modifié.',
  demoFaP4:
    'Les 6 sous-agents ont terminé (23 dossiers analysés, lecture seule). Voici l’analyse combinée.',
  demoFaHeading: 'Analyse des dossiers du projet — 23 dossiers',
  demoFaSnapshot: 'Aperçu',
  demoFaThCategory: 'Catégorie',
  demoFaThFolders: 'Dossiers',
  demoFaThVerdict: 'Verdict',
  demoFaRowActive: 'Projets de code actifs',
  demoFaRowKeep: 'Conserver',
  demoFaRowFinished: 'Projets terminés',
  demoFaRowArchiveConfirmed: 'Archiver une fois confirmé',
  demoFaRowDocuments: 'Documents, notes et médias',
  demoFaRowTidy: 'Ranger ou archiver',
  demoFaRowEmpty: 'Dossiers vides',
  demoFaRowDelete: 'Supprimer',
  demoFaRowDormant: 'Projets ponctuels dormants',
  demoFaRowArchive: 'Archiver',
};

const suggestDe = {
  demoSuggestContract: 'Fasse diesen Vertrag zusammen und markiere riskante Punkte',
  demoSuggestProposal: 'Entwirf ein Angebot für einen neuen Kunden',
  demoSuggestCompetitors: 'Was verlangen meine Wettbewerber?',
  demoSuggestInvoices: 'Welche Rechnungen sind überfällig?',
};

const faDe = {
  demoFaUserPrompt: 'Analysiere meine Projektordner mit parallelen Subagents',
  demoFaThought:
    'Zuerst den Ordner auflisten, dann die Analyse auf Subagents aufteilen, damit jeder parallel einige Ordner liest. Alles bleibt schreibgeschützt.',
  demoFaTool1Label: 'Projekte aufgelistet',
  demoFaTool1Detail: faDetail.replace('more', 'weitere'),
  demoFaP2:
    'Ich hole eine saubere Liste nur der Ordner, um die Analyse parallel zu delegieren.',
  demoFaTool2Label: 'local_shell',
  demoFaP3Part1: 'Ihr Projects-Ordner enthält ',
  demoFaP3Bold: '23 Ordner',
  demoFaTool3Label: '6 Subagents',
  demoFaTool3Detail: '6 von 6 abgeschlossen. Nur Lesen: keine Dateien geändert.',
  demoFaP4:
    'Alle 6 Subagents sind fertig (23 Ordner analysiert, nur Lesen). Hier ist die kombinierte Analyse.',
  demoFaHeading: 'Projektordner-Analyse — 23 Ordner',
  demoFaSnapshot: 'Übersicht',
  demoFaThCategory: 'Kategorie',
  demoFaThFolders: 'Ordner',
  demoFaThVerdict: 'Urteil',
  demoFaRowActive: 'Aktive Codeprojekte',
  demoFaRowKeep: 'Behalten',
  demoFaRowFinished: 'Abgeschlossene Projekte',
  demoFaRowArchiveConfirmed: 'Archivieren nach Bestätigung',
  demoFaRowDocuments: 'Dokumente, Notizen und Medien',
  demoFaRowTidy: 'Aufräumen oder archivieren',
  demoFaRowEmpty: 'Leere Ordner',
  demoFaRowDelete: 'Löschen',
  demoFaRowDormant: 'Ruhende Einzelprojekte',
  demoFaRowArchive: 'Archivieren',
};

function zhTail(isTw) {
  const t = (s, tw) => (isTw ? tw : s);
  return {
    demoChatSeoAudit: t('SEO 审计清单', 'SEO 稽核清單'),
    demoChatCompetitorPricing: t('竞争对手定价', '競爭對手定價'),
    demoChatWeeklyReport: t('根据笔记生成周报', '根據筆記產生週報'),
    demoNewChat: t('新对话', '新對話'),
    demoAgo22m: '22m',
    demoAgo3d: '3d',
    demoAgo2d: '2d',
    demoAgo5d: '5d',
    demoAgo21d: '21d',
    demoAgo2mo: '2mo',
    demoAgo1mo: '1mo',
    demoAgoNow: t('现在', '現在'),
    demoAgoMinutes: t('{count} 分钟前', '{count} 分鐘前'),
    demoAgoDays: t('{count} 天前', '{count} 天前'),
    demoAgoMonths: t('{count} 个月前', '{count} 個月前'),
    demoAgoJustNow: t('刚刚', '剛剛'),
    demoHelpQuestion: t('有什么可以帮你的？', '有什麼可以幫你的？'),
    demoSuggestContract: t('总结这份合同并标出风险点', '總結這份合約並標出風險點'),
    demoSuggestProposal: t('为新客户起草一份提案', '為新客戶起草一份提案'),
    demoSuggestCompetitors: t('竞争对手收费多少？', '競爭對手收費多少？'),
    demoSuggestInvoices: t('哪些发票已逾期？', '哪些發票已逾期？'),
    demoFaUserPrompt: t('用并行子代理分析我的项目文件夹', '使用平行子代理分析我的專案資料夾'),
    demoFaThought: t(
      '先列出文件夹，再把分析分给多个子代理并行读取各自负责的文件夹。全程只读。',
      '先列出資料夾，再把分析分給多個子代理平行讀取各自負責的資料夾。全程唯讀。',
    ),
    demoFaTool1Label: t('已列出的项目', '已列出的專案'),
    demoFaTool1Detail: t(
      'api-gateway/\\nmarketing-site/\\ninvoices-2025/\\nmobile-app/\\nnotes/\\nold-experiments/\\n... 还有 17 个',
      'api-gateway/\\nmarketing-site/\\ninvoices-2025/\\nmobile-app/\\nnotes/\\nold-experiments/\\n... 還有 17 個',
    ),
    demoFaP2: t('我先整理一份仅含文件夹的清单，以便并行分配分析任务。', '我先整理一份僅含資料夾的清單，以便平行分配分析任務。'),
    demoFaTool2Label: 'local_shell',
    demoFaP3Part1: t('你的 Projects 文件夹共有 ', '你的 Projects 資料夾共有 '),
    demoFaP3Bold: t('23 个文件夹', '23 個資料夾'),
    demoFaTool3Label: t('6 个子代理', '6 個子代理'),
    demoFaTool3Detail: t('6/6 已完成。只读：未修改任何文件。', '6/6 已完成。唯讀：未修改任何檔案。'),
    demoFaP4: t(
      '6 个子代理全部完成（已分析 23 个文件夹，只读）。以下是合并后的分析结果。',
      '6 個子代理全部完成（已分析 23 個資料夾，唯讀）。以下是合併後的分析結果。',
    ),
    demoFaHeading: t('项目文件夹分析 — 23 个文件夹', '專案資料夾分析 — 23 個資料夾'),
    demoFaSnapshot: t('快照', '快照'),
    demoFaThCategory: t('类别', '類別'),
    demoFaThFolders: t('文件夹', '資料夾'),
    demoFaThVerdict: t('结论', '結論'),
    demoFaRowActive: t('活跃代码项目', '活躍程式碼專案'),
    demoFaRowKeep: t('保留', '保留'),
    demoFaRowFinished: t('已完成项目', '已完成專案'),
    demoFaRowArchiveConfirmed: t('确认后归档', '確認後封存'),
    demoFaRowDocuments: t('文档、笔记与媒体', '文件、筆記與媒體'),
    demoFaRowTidy: t('整理或归档', '整理或封存'),
    demoFaRowEmpty: t('空文件夹', '空資料夾'),
    demoFaRowDelete: t('删除', '刪除'),
    demoFaRowDormant: t('闲置的一次性项目', '閒置的一次性專案'),
    demoFaRowArchive: t('归档', '封存'),
    demoTypePlaceholder: t('输入…', '輸入…'),
    demoSendMessage: t('发送消息', '傳送訊息'),
    demoCopy: t('复制', '複製'),
    demoDelete: t('删除', '刪除'),
    demoThoughtLabel: t('思考', '思考'),
    demoWaitingApproval: t('等待你的批准', '等待你的核准'),
    demoAllow: t('允许', '允許'),
    demoDeny: t('拒绝', '拒絕'),
    demoCurrentModel: t('当前模型', '目前模型'),
    demoQuickPicks: t('快捷选择', '快速選擇'),
    demoCreditsCount: t('{credits} 点数', '{credits} 點數'),
    demoCreditSingle: t('1 点', '1 點'),
    demoCreditsLabel: t('点数', '點數'),
    demoCallsCount: t('{calls} 次调用', '{calls} 次呼叫'),
    demoCallSingle: t('1 次调用', '1 次呼叫'),
    demoDoneStatus: t('完成', '完成'),
    demoPromptVendor: t('总结供应商合同并标出风险点。', '總結供應商合約並標出風險點。'),
    demoAllModelsTitle: t('全部模型', '全部模型'),
    demoAllModelsDesc: t(
      '浏览并选择所有可用 AI 模型。默认推荐排在前面。',
      '瀏覽並選擇所有可用 AI 模型。預設推薦排在前面。',
    ),
    demoSearchModelsPlaceholder: t('搜索模型…', '搜尋模型…'),
    demoNoModelsFound: t('未找到模型', '找不到模型'),
    demoAddModels: t('添加模型', '新增模型'),
    demoPerMsg: '/ msg',
    demoShowInQuickPicks: t('在快捷选择中显示 {model}', '在快速選擇中顯示 {model}'),
    demoDesktopPrompt: t('按类型整理我的“下载”文件夹。', '依類型整理我的「下載」資料夾。'),
    demoDesktopIntro: t('我先查看“下载”文件夹里有什么。', '我先查看「下載」資料夾裡有什麼。'),
    demoDesktopListed: t('已列出“下载”', '已列出「下載」'),
    demoDesktopPlan: t(
      '找到 142 个文件。将分组到文档、图片、安装包、压缩包和其他。移动文件前需先获得你的批准。',
      '找到 142 個檔案。將分組到文件、圖片、安裝包、壓縮檔和其他。移動檔案前需先獲得你的核准。',
    ),
    demoDesktopDone: t(
      '完成。已创建 5 个文件夹并移动 142 个文件。未删除任何内容。',
      '完成。已建立 5 個資料夾並移動 142 個檔案。未刪除任何內容。',
    ),
    demoToolsPrompt: t(
      '总结 annual-report.pdf，查看竞争对手收费，并在邮件中查找 Acme 发票。',
      '總結 annual-report.pdf，查看競爭對手收費，並在郵件中查找 Acme 發票。',
    ),
    demoToolsAnswerReport: t('报告：', '報告：'),
    demoToolsAnswerReportBody: t(' 收入增长，利润率持平。 ', ' 收入成長，利潤率持平。 '),
    demoToolsAnswerCompetitors: t('竞争对手：', '競爭對手：'),
    demoToolsAnswerCompetitorsBody: t(' 多数收取固定月费。 ', ' 多數收取固定月費。 '),
    demoToolsAnswerEmail: t('邮件：', '郵件：'),
    demoToolsAnswerEmailBody: t(' Acme 发票于周二送达。', ' Acme 發票於週二送達。'),
    demoWalletPrompt1: t('审查这份合同中的风险条款', '審查這份合約中的風險條款'),
    demoWalletReply1: t('第 7.2 条允许供应商提前 14 天调整价格。', '第 7.2 條允許供應商提前 14 天調整價格。'),
    demoWalletPrompt2: t('起草一封礼貌的跟进邮件', '起草一封禮貌的跟進郵件'),
    demoWalletReply2: t(
      'Sam 你好，想跟进一下提案进展。如有问题欢迎随时联系。',
      'Sam 你好，想跟進一下提案進展。如有問題歡迎隨時聯繫。',
    ),
    demoWalletPrompt3: t('修复此函数中的 off-by-one 错误', '修復此函式中的 off-by-one 錯誤'),
    demoWalletReply3: t('循环跑到 arr.length + 1。应改为 arr.length。', '迴圈跑到 arr.length + 1。應改為 arr.length。'),
    demoWalletPrompt4: t('哪些发票已逾期？', '哪些發票已逾期？'),
    demoWalletReply4: t('INV-4021 已逾期 12 天。INV-4033 已逾期 5 天。', 'INV-4021 已逾期 12 天。INV-4033 已逾期 5 天。'),
    demoReplay: t('重播', '重播'),
    demoTryWithFiles: t('用你自己的文件试试', '用你自己的檔案試試'),
    demoTryInWindows: t('在 Windows 应用中试用', '在 Windows 應用程式中試用'),
    demoOrTryOnWeb: t('或在网页上试用', '或在網頁上試用'),
    demoTryOnWeb: t('在网页上试用', '在網頁上試用'),
    demoLinuxComingSoon: t('Linux 应用即将推出', 'Linux 應用程式即將推出'),
    demoMacComingSoon: t('macOS 应用即将推出', 'macOS 應用程式即將推出'),
    demoInfo: 'info',
    demoLinuxModalTitle: t('Linux 桌面应用即将推出', 'Linux 桌面應用程式即將推出'),
    demoLinuxModalP1: t(
      '我们目前原生支持 Windows 桌面版，Linux 桌面应用正在积极开发中。',
      '我們目前原生支援 Windows 桌面版，Linux 桌面應用程式正在積極開發中。',
    ),
    demoLinuxModalP2: t(
      '与此同时，你可以在浏览器中完整使用 AIGenius——多模型对话、本地附件与工具一应俱全！',
      '在此期間，你可以在瀏覽器中完整使用 AIGenius——多模型對話、本機附件與工具一應俱全！',
    ),
    demoLinuxModalDismiss: t('关闭', '關閉'),
    demoContinueOnWeb: t('继续在网页上使用', '繼續在網頁上使用'),
  };
}

const patches = {
  es: { ...suggestEs, ...faEs },
  fr: { ...suggestFr, ...faFr },
  de: { ...suggestDe, ...faDe },
  zh: zhTail(false),
  'zh-tw': zhTail(true),
};

const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const enKeys = Object.keys(en);

for (const [mod, patch] of Object.entries(patches)) {
  const p = path.join(dataDir, `${mod}.json`);
  const landing = JSON.parse(fs.readFileSync(p, 'utf8'));
  Object.assign(landing, patch);
  const ordered = {};
  for (const k of enKeys) {
    if (landing[k] === undefined) throw new Error(`${mod} missing key ${k}`);
    ordered[k] = landing[k];
  }
  fs.writeFileSync(p, JSON.stringify(ordered, null, 2), 'utf8');
  console.log('merged', mod, Object.keys(ordered).length);
}

spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', 'es', 'fr', 'de', 'zh', 'zh-tw'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
