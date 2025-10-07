const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');

const app = express();

// Configurar para recibir binarios tipo PDF
app.use(express.raw({ type: 'application/pdf', limit: '10mb' }));

app.post('/extract-pdf-text', async (req, res) => {
  try {
    console.log('📥 Recibiendo PDF binario...');
    const buffer = req.body;

    // Guardar PDF para debug
    fs.writeFileSync('debug.pdf', buffer);
    console.log('✅ PDF guardado como debug.pdf');

    // Leer contenido del PDF
    const data = await pdf(buffer);
    console.log('📄 Texto extraído:', data.text);

    res.json({ texto: data.text });
  } catch (error) {
    console.error('❌ Error al procesar el PDF:', error);
    res.status(500).json({ error: 'No se pudo procesar el PDF' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
