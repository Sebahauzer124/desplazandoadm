// server.js
const express = require('express');
const bodyParser = require('body-parser');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware para JSON grande (PDF en base64 puede ser pesado)
app.use(bodyParser.json({ limit: '50mb' }));

/**
 * Convierte Base64 de PDF a texto
 * @param {string} base64PDF - PDF en Base64
 * @returns {Promise<string|null>} - Texto extraído o null si falla
 */
async function extractTextFromBase64PDF(base64PDF) {
    try {
        console.log("Recibiendo PDF base64...");

        // Limpiar prefijo si existe
        if (base64PDF.startsWith("data:")) {
            base64PDF = base64PDF.split(",")[1];
        }

        // Eliminar todos los espacios, saltos de línea y retornos
        base64PDF = base64PDF.replace(/[\s\r\n]+/g, '');

        console.log("Convertiendo Base64 a Buffer...");
        const pdfBuffer = Buffer.from(base64PDF, 'base64');

        // Validar si realmente es un PDF
        if (pdfBuffer.toString('utf8', 0, 4) !== '%PDF') {
            console.error("El Base64 recibido no corresponde a un PDF válido.");
            fs.writeFileSync(path.join(__dirname, 'debug_invalid.pdf'), pdfBuffer);
            return null;
        }

        // Guardar PDF temporal para depuración
        const debugPath = path.join(__dirname, 'debug.pdf');
        fs.writeFileSync(debugPath, pdfBuffer);

        console.log("Extrayendo texto del PDF...");
        const data = await pdf(pdfBuffer);

        console.log("Texto extraído con éxito. Primeros 200 caracteres:");
        console.log(data.text.substring(0, 200));

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
        console.log("No se envió base64");
        return res.status(400).json({ error: "No se envió base64" });
    }

    const texto = await extractTextFromBase64PDF(base64);

    if (!texto) {
        console.log("No se pudo extraer texto del PDF");
        return res.status(500).json({ error: "No se pudo extraer texto del PDF. Se creó debug.pdf para revisión." });
    }

    res.json({ texto });
});

// NUEVA RUTA: descargar debug.pdf
app.get('/download-debug', (req, res) => {
    const debugPath = path.join(__dirname, 'debug.pdf');
    if (fs.existsSync(debugPath)) {
        res.download(debugPath, 'debug.pdf');
    } else {
        res.status(404).send('debug.pdf no encontrado');
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
