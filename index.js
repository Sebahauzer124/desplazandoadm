const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { fileTypeFromBuffer } = require('file-type');

const app = express();

// Configurar para recibir binarios PDF o imágenes (máx. 20 MB)
app.use(express.raw({ type: ['application/pdf', 'image/*'], limit: '20mb' }));

// --- Función para mejorar la imagen antes del OCR ---
async function preprocessImage(buffer) {
  return await sharp(buffer)
    .rotate()                 // corrige rotación automática según EXIF
    .grayscale()              // escala de grises
    .normalize()              // mejora contraste y brillo
    .resize({ width: 1800 })  // aumenta resolución para OCR
    .threshold(150)           // binarización (blanco y negro)
    .png()
    .toBuffer();
}

// --- Función OCR con timeout y configuración avanzada ---
async function performOCR(buffer) {
  const ocrPromise = Tesseract.recognize(buffer, 'spa', {
    tessedit_pageseg_mode: 6,      // bloque uniforme de texto
    tessedit_ocr_engine_mode: 1,   // LSTM moderno para mayor precisión
    preserve_interword_spaces: 1,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('OCR timeout')), 30000)
  );

  const { data: { text } } = await Promise.race([ocrPromise, timeoutPromise]);
  return text;
}

// --- Filtrar solo números y precios ---
function extractNumbers(text) {
  return text.match(/[\d,.]+/g) || [];
}

// --- Endpoint principal ---
app.post('/extract-text', async (req, res) => {
  try {
    console.log('📥 Recibiendo archivo binario...');

    const buffer = req.body;
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      console.warn('⚠️ Archivo vacío o no recibido');
      return res.status(400).json({ error: 'Archivo vacío o no recibido' });
    }

    // Guardar archivo para debug
    const debugFile = `debug_file_${Date.now()}`;
    fs.writeFileSync(debugFile, buffer);
    console.log(`✅ Archivo guardado como ${debugFile}`);

    const fileInfo = await fileTypeFromBuffer(buffer);
    if (!fileInfo) {
      return res.status(400).json({ error: 'No se pudo determinar el tipo de archivo' });
    }

    let text = '';

    if (fileInfo.mime === 'application/pdf') {
      console.log('📄 Detectado PDF');
      const data = await pdf(buffer);
      text = data.text;

    } else if (fileInfo.mime.startsWith('image/')) {
      console.log(`🖼️ Detectado imagen (${fileInfo.mime}), ejecutando OCR...`);
      try {
        const processedBuffer = await preprocessImage(buffer);
        text = await performOCR(processedBuffer);
      } catch (err) {
        console.error('❌ Error en procesamiento de imagen:', err);
        return res.status(500).json({ error: 'Error procesando imagen', details: err.message });
      }

    } else {
      console.warn('⚠️ Tipo de archivo desconocido');
      return res.status(400).json({ error: 'Tipo de archivo no soportado' });
    }

    console.log('📄 Texto extraído con éxito');
    
    // Extraer solo números como opción
    const numbers = extractNumbers(text);

    res.json({ texto: text.trim(), numeros: numbers });

  } catch (error) {
    console.error('❌ Error al procesar el archivo:', error);
    res.status(500).json({ error: 'No se pudo procesar el archivo', details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
