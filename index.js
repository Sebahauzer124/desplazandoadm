const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');
const FileType = require('file-type');

const app = express();

// Configurar para recibir binarios PDF o imágenes (máx. 20 MB)
app.use(express.raw({ type: ['application/pdf', 'image/*'], limit: '20mb' }));

// --- Función para mejorar la imagen antes del OCR ---
async function preprocessImage(buffer) {
  const image = await Jimp.read(buffer);
  image
    .grayscale()        // Convierte a blanco y negro
    .contrast(1)        // Aumenta contraste
    .normalize()        // Normaliza brillo
    .resize(2000, Jimp.AUTO); // Agranda si es chica
  return await image.getBufferAsync(Jimp.MIME_PNG);
}

// --- Endpoint principal ---
app.post('/extract-text', async (req, res) => {
  try {
    console.log('📥 Recibiendo archivo binario...');
    const buffer = req.body;

    // Guardar para debug
    const debugFile = 'debug_file';
    fs.writeFileSync(debugFile, buffer);
    console.log(`✅ Archivo guardado como ${debugFile}`);

    // Detectar tipo de archivo
    const fileInfo = await FileType.fromBuffer(buffer);
    let text = '';

    if (fileInfo?.mime === 'application/pdf') {
      console.log('📄 Detectado PDF');
      const data = await pdf(buffer);
      text = data.text;

    } else if (fileInfo?.mime?.startsWith('image/')) {
      console.log(`🖼️ Detectado imagen (${fileInfo.mime}), ejecutando OCR...`);
      const processedBuffer = await preprocessImage(buffer);
      const { data: { text: ocrText } } = await Tesseract.recognize(processedBuffer, 'spa', {
        tessedit_pageseg_mode: 3, // Detección automática de bloques
        preserve_interword_spaces: 1,
      });
      text = ocrText;

    } else {
      console.warn('⚠️ Tipo de archivo desconocido');
      return res.status(400).json({ error: 'Tipo de archivo no soportado' });
    }

    console.log('📄 Texto extraído con éxito');
    res.json({ texto: text.trim() });

  } catch (error) {
    console.error('❌ Error al procesar el archivo:', error);
    res.status(500).json({ error: 'No se pudo procesar el archivo' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
