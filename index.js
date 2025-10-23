const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

const app = express();

// Configurar para recibir binarios de tipo PDF o imágenes
app.use(express.raw({ type: ['application/pdf', 'image/*'], limit: '20mb' }));

app.post('/extract-text', async (req, res) => {
  try {
    console.log('📥 Recibiendo archivo binario...');
    const buffer = req.body;

    // Guardar archivo para debug
    const debugFile = 'debug_file';
    fs.writeFileSync(debugFile, buffer);
    console.log(`✅ Archivo guardado como ${debugFile}`);

    // Determinar tipo de archivo por encabezado de bytes
    const fileType = buffer.toString('hex', 0, 4);
    let text = '';

    if (fileType.startsWith('25504446')) {
      // PDF magic number = %PDF
      console.log('📄 Detectado PDF');
      const data = await pdf(buffer);
      text = data.text;
    } else {
      // Suponemos imagen
      console.log('🖼️ Detectado imagen, ejecutando OCR...');
      const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'spa'); // 'spa' para español
      text = ocrText;
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
