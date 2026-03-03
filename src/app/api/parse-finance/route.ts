import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
const PDFParser = require('pdf2json');
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// Extraction helpers
const regexes = {
  chiffreAffaires: /(CA\s*[:=]?\s*([\d\s.,kK]+)€?)|(chiffre d'affaires\s*[:=]?\s*([\d\s.,kK]+)€?)|(total factur[ée]\s*[:=]?\s*([\d\s.,kK]+)€?)|(revenus?\s*[:=]?\s*([\d\s.,kK]+)€?)/i,
  loyer: /(loyer|rent|bail)\s*[:=]?\s*([\d\s.,kK]+)€?/i,
  salaires: /(salaire[s]?|bulletin salaire|salaire net)\s*[:=]?\s*([\d\s.,kK]+)€?/i,
  assurances: /(assurances?|cotisations?)\s*[:=]?\s*([\d\s.,kK]+)€?/i,
  abonnements: /(abonnements?|forfaits?)\s*[:=]?\s*([\d\s.,kK]+)€?/i,
  emprunts: /(emprunt[s]?|crédit[s]?)\s*[:=]?\s*([\d\s.,kK]+)€?/i,
  autres: /(fournitures?|publicité|frais)\s*[:=]?\s*([\d\s.,kK]+)€?/i,
  tauxChargesVariables: /(taux charges variables|charges variables)\s*[:=]?\s*([\d\s.,kK]+)%?/i,
};

function parseMontant(val: string | undefined): number | undefined {
  if (!val) return undefined;
  val = val.replace(/\s|€/g, '').replace(/k/i, '000').replace(',', '.');
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

function extractFields(text: string) {
  const result: any = {};
  const detectedFields: string[] = [];
  for (const [key, regex] of Object.entries(regexes)) {
    const match = text.match(regex);
    if (match) {
      const montant = match[2] || match[3] || match[4] || match[5] || match[6] || match[7];
      const value = parseMontant(montant);
      if (value !== undefined) {
        result[key] = value;
        detectedFields.push(key);
      }
    }
  }
  result.detectedFields = detectedFields;
  return result;
}

async function parseFile(file: File): Promise<any> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    // Extraction texte PDF avec pdf2json
    const pdfParser = new PDFParser();
    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        // Concaténer tout le texte extrait
        const text = pdfData.formImage.Pages.map((page: any) =>
          page.Texts.map((t: any) => decodeURIComponent(t.R.map((r: any) => r.T).join(''))).join(' ')
        ).join(' ');
        resolve(extractFields(text));
      });
      pdfParser.parseBuffer(buffer);
    });
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let text = '';
    workbook.SheetNames.forEach(sheet => {
      const ws = workbook.Sheets[sheet];
      text += XLSX.utils.sheet_to_csv(ws, { FS: ' ' });
    });
    return extractFields(text);
  } else if (name.endsWith('.csv')) {
    const csv = buffer.toString('utf-8');
    const parsed = Papa.parse(csv, { header: false });
    const text = parsed.data.flat().join(' ');
    return extractFields(text);
  }
  throw new Error('Format de fichier non supporté');
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
  }
  try {
    const fields = await parseFile(file);
    return NextResponse.json({
      chiffreAffaires: fields.chiffreAffaires || 0,
      loyer: fields.loyer || 0,
      salaires: fields.salaires || 0,
      assurances: fields.assurances || 0,
      abonnements: fields.abonnements || 0,
      emprunts: fields.emprunts || 0,
      autres: fields.autres || 0,
      tauxChargesVariables: fields.tauxChargesVariables || 0,
      detectedFields: fields.detectedFields || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
