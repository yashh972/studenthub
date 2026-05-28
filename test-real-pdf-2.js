const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
const { PDFParse } = require('pdf-parse');

async function testRealPdf() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'uploads', '1779821939582-Assignment_No_2_623_.pdf__2_.pdf');
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const parsed = await parser.getText();
    console.log('parsed.text type:', typeof parsed.text);
    console.log('parsed.text length:', parsed.text ? parsed.text.length : 0);
    console.log('parsed.text preview:', parsed.text ? parsed.text.substring(0, 300) : 'none');
  } catch (err) {
    console.error('CRASH:', err);
  }
}

testRealPdf();
