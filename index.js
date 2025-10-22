const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const multer = require('multer');
const FileType = require('file-type');

const app = express();

// Configuración de multer para guardar archivos en memoria
const upload = multer({ storage: multer.memoryStorage() });

app.post('/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const buffer = req.file.buffer;

    // Detectar tipo de archivo
    const type = await FileType.fromBuffer(buffer);
    if (!type) {
      return res.status(400).json({ error: 'Tipo de archivo no soportado' });
    }

    // Guardar archivo para debug con la extensión correcta
    const debugFile = `debug_file.${type.ext}`;
    fs.writeFileSync(debugFile, buffer);
    console.log(`✅ Archivo guardado como ${debugFile}`);

    let text = '';

    if (type.mime === 'application/pdf') {
      console.log('📄 Detectado PDF');
      const data = await pdf(buffer);
      text = data.text || '';
    } else if (type.mime.startsWith('image/')) {
      console.log('🖼️ Detectado imagen, ejecutando OCR...');
      const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'spa');
      text = ocrText;
    } else {
      return res.status(400).json({ error: 'Tipo de archivo no soportado para extracción de texto' });
    }

    console.log('📄 Texto extraído:', text);

    res.json({ texto: text });

  } catch (error) {
    console.error('❌ Error al procesar el archivo:', error);
    res.status(500).json({ error: 'No se pudo procesar el archivo' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
