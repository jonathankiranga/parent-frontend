import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(here, 'pdfExport.js');
let src = fs.readFileSync(srcPath, 'utf8');
src = "import __path from 'path';\nconst __OUT = process.env.OUT_PDF;\n" +
  src.replace(/doc\.save\(([^;]+)\);/g, "fs.writeFileSync(__OUT, Buffer.from(doc.output('arraybuffer')));");
const patchedPath = path.join(here, '_patched_pdfExport.mjs');
fs.writeFileSync(patchedPath, src);
const patchedPath = path.join(here, '_patched_pdfExport.mjs');
fs.writeFileSync(patchedPath, src);

const { downloadAcademicPdf, downloadFeePdf } = await import('./_patched_pdfExport.mjs');

const report = {
  student: { student_id: 'STU6MYSGH', full_name: 'Kiranga Junior', class_name: 'Grade 1' },
  term: 'Term 1',
  year: 2026,
  areas: [
    { area_name: 'Creative Arts', avg_pct: '86.5', strand_summary: 'Performing and Displaying:EE' },
    { area_name: 'English', avg_pct: '80.0', strand_summary: 'Listening and Speaking:ME, Listening and Speaking:EE' },
    { area_name: 'Environmental Activities', avg_pct: '60.0', strand_summary: 'Social Environment:AE, Social Environment:ME' },
    { area_name: 'Kiswahili', avg_pct: '66.5', strand_summary: 'Kusikiliza na Kuzungumza:ME' },
    { area_name: 'Mathematics', avg_pct: '72.0', strand_summary: 'Numbers:ME' },
    { area_name: 'Religious Education', avg_pct: '53.5', strand_summary: 'Creation:AE' }
  ],
  attendance: { total: 50, present: 45 },
  report_settings: {
    show_teacher_name: true,
    teacher_name: 'JONATHAN KIRANGA',
    show_final_remarks: true,
    final_remarks: 'Kiranga Junior has shown steady progress this term. He participates actively in class discussions and works well with others. He should continue practising reading fluency at home.',
    show_recommendation: true,
    recommendation_text: 'Promoted to next level. Keep up the good work.'
  },
  school_contact: {
    school_id: 'SCH336585',
    school_name: 'Mutitu Academy',
    contact_phone: '0725999521',
    contact_email: 'kirangajon@gmail.com'
  }
};

await downloadAcademicPdf(report, 'Kiranga Junior', '254725999521', 'Term 1');

const feeStatement = {
  items: [
    { fee_name: 'Tuition Fee', amount: 4500, effective_amount: 4500, paid: 4500, balance: 0 },
    { fee_name: 'Lunch Programme', amount: 2000, effective_amount: 2000, paid: 1500, balance: 500 },
    { fee_name: 'Activity Fee', amount: 800, effective_amount: 800, paid: 300, balance: 500 }
  ],
  total_due: 7300,
  total_paid: 6300,
  balance: 1000
};

await downloadFeePdf(feeStatement, 'Kiranga Junior', '254725999521', '1', '2026');
console.log('PDFs written to OUT_PDF paths used per call (last one wins) — check output dir.');
