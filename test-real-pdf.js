const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
const { PDFParse } = require('pdf-parse');

async function testRealPdf() {
  try {
    console.log('Reading real PDF...');
    const filePath = path.join(process.cwd(), 'public', 'uploads', '1779821939582-Assignment_No_2_623_.pdf__2_.pdf');
    const dataBuffer = fs.readFileSync(filePath);
    console.log('File size:', dataBuffer.length);
    
    const parser = new PDFParse({ data: dataBuffer });
    console.log('Instantiated PDFParse.');
    
    const parsed = await parser.getText();
    console.log('Parsed text type:', typeof parsed);
    console.log('Keys of parsed object:', Object.keys(parsed || {}));
    console.log('Preview text:', parsed ? parsed.substring(0, 200) : 'none');
  } catch (err) {
    console.error('CRASH IN TEST:', err);
  }
}

testRealPdf();
