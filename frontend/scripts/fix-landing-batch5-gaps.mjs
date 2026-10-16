/**
 * Hand-tuned fixes for keys that often stay English (brands, shorthand, technical tokens).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../src/locales/data/landing');

const FIXES = {
  vi: {
    allRightsReserved: 'Công ty Nobox Labs Limited',
    demoAgo22m: '22 phút',
    demoAgo3d: '3 ng',
    demoFaTool2Label: 'local_shell',
    models: 'Mô hình',
  },
  id: {
    desktop: 'Komputer',
    legal: 'Hukum',
    allRightsReserved: 'Nobox Labs Limited (Hak cipta)',
    demoAgo22m: '22 mnt',
    demoAgo3d: '3 hr',
    demoAgo2d: '2 hr',
    demoAgo5d: '5 hr',
    demoAgo21d: '21 hr',
    demoFaTool2Label: 'local_shell',
    demoInfo: 'informasi',
  },
  th: {
    allRightsReserved: 'บริษัท Nobox Labs Limited',
    demoAgo3d: '3 วัน',
    demoFaTool2Label: 'local_shell',
  },
  bn: {
    allRightsReserved: 'নোবক্স ল্যাবস লিমিটেড',
    demoAgo2d: '২ দিন',
    demoAgo5d: '৫ দিন',
    demoFaTool2Label: 'local_shell',
    demoFaThVerdict: 'রায়',
    demoFaRowArchive: 'আর্কাইভ',
    demoCreditSingle: '১ ক্রেডিট',
    demoShowInQuickPicks: 'দ্রুত বাছাইতে {model} দেখান',
    demoDesktopListed: 'ডাউনলোড তালিকাভুক্ত',
    demoToolsAnswerEmail: 'ইমেইল:',
    demoWalletReply1: 'ধারা ৭.২ বিক্রেতাকে ১৪ দিনের নোটিশে মূল্য পরিবর্তন করতে দেয়।',
    demoWalletReply2: 'হাই স্যাম, প্রস্তাব নিয়ে শুধু যাচাই করছি। যেকোনো প্রশ্নের উত্তর দিতে পেরে খুশি।',
    demoOrTryOnWeb: 'অথবা ওয়েবে চেষ্টা করুন',
    demoMacComingSoon: 'macOS অ্যাপ শীঘ্রই আসছে',
    demoLinuxModalDismiss: 'বাতিল',
  },
  ms: {
    desktop: 'Komputer',
    allRightsReserved: 'Nobox Labs Limited',
    demoAgo22m: '22 min',
    demoAgo3d: '3 h',
    demoAgo5d: '5 h',
    demoAgo21d: '21 h',
    demoFaTool2Label: 'local_shell',
    demoInfo: 'maklumat',
  },
  fil: {
    desktop: 'Kompyuter',
    legal: 'Legal na',
    allRightsReserved: 'Nobox Labs Limited',
    demoAgo22m: '22 min',
    demoAgo3d: '3 araw',
    demoAgo2d: '2 araw',
    demoAgo5d: '5 araw',
    demoAgo21d: '21 araw',
    demoFaTool2Label: 'local_shell',
    demoInfo: 'impormasyon',
  },
};

for (const [mod, patch] of Object.entries(FIXES)) {
  const fp = path.join(dataDir, `${mod}.json`);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  Object.assign(data, patch);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
  console.log('fixed', mod, Object.keys(patch).length);
}
