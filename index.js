// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { fromBuffer } = require('pdf2pic'); // convierte PDF a imágenes
const Tesseract = require('tesseract.js');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware para JSON grande
app.use(bodyParser.json({ limit: '50mb' }));

/**
 * Convierte un PDF en base64 a texto usando OCR
 * @param {string} base64PDF - PDF en Base64
 */
async function extractTextFromBase64PDF(base64PDF) {
    try {
        // Limpiar prefijo si existe
        if (base64PDF.startsWith("data:")) {
            base64PDF = base64PDF.split(",")[1];
        }

        const pdfBuffer = Buffer.from(base64PDF, 'base64');

        // Convertimos PDF a imágenes (una por página)
        const converter = fromBuffer(pdfBuffer, { density: 150, format: "png" });
        const images = await converter(1); // si querés todas las páginas hay que iterar

        // Aplicamos OCR sobre la imagen resultante
        const { data: { text } } = await Tesseract.recognize(images.path, 'spa', { logger: m => console.log(m) });

        return text;
    } catch (err) {
        console.error("Error extrayendo texto del PDF:", err);
        return null;
    }
}

// Ruta POST
app.post('/extract-pdf-text', async (req, res) => {
    const { base64 } = req.body;

    if (!base64) {
        return res.status(400).json({ error: "No se envió base64" });
    }

    const texto = await extractTextFromBase64PDF(base64);

    if (!texto) {
        return res.status(500).json({ error: "No se pudo extraer texto del PDF" });
    }

    res.json({ texto });
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
