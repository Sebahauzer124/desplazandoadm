// server.js
const express = require('express');
const bodyParser = require('body-parser');
const pdf = require('pdf-parse');

const app = express();
const PORT = 8080;

// Middleware para recibir JSON grande (PDF en base64 puede ser pesado)
app.use(bodyParser.json({ limit: '50mb' }));

/**
 * Función que convierte Base64 de PDF a texto
 */
async function extractTextFromBase64PDF(base64Data) {
    try {
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const data = await pdf(pdfBuffer);
        return data.text;
    } catch (err) {
        console.error("Error extrayendo texto del PDF:", err);
        return null;
    }
}

// Ruta POST para recibir PDF en base64
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
