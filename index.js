import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rota de saúde
app.get("/", (req, res) => {
  res.send("API de e-mail do Pilar Mail está rodando ✅");
});

/**
 * Rota para envio de e-mail.
 * O Lovable deve mandar um POST para /send-email com JSON:
 *
 * {
 *   "smtpHost": "smtp.servidor.com",
 *   "smtpPort": 465,
 *   "smtpSecure": true,
 *   "user": "usuario@dominio.com",
 *   "pass": "SENHA_OU_TOKEN_APP",
 *   "from": "Nome <usuario@dominio.com>",   // opcional, se não vier usa user
 *   "to": "destinatario@dominio.com",
 *   "subject": "Assunto do e-mail",
 *   "text": "Corpo em texto simples",
 *   "html": "<p>Corpo em HTML</p>"          // opcional
 * }
 */
app.post("/send-email", async (req, res) => {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      user,
      pass,
      from,
      to,
      subject,
      text,
      html
    } = req.body;

    if (!smtpHost || !smtpPort || !user || !pass || !to || !subject) {
      return res.status(400).json({
        ok: false,
        error: "Campos obrigatórios: smtpHost, smtpPort, user, pass, to, subject"
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Boolean(smtpSecure), // true para 465, false normalmente para 587
      auth: {
        user,
        pass
      }
    });

    const mailOptions = {
      from: from || user,
      to,
      subject,
      text: text || undefined,
      html: html || undefined
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📤 Email enviado por ${user} → ${to} | ID: ${info.messageId}`);

    return res.json({
      ok: true,
      messageId: info.messageId,
      to,
      from: mailOptions.from
    });
  } catch (err) {
    console.error("❌ Erro em /send-email:", err);
    return res.status(500).json({
      ok: false,
      error: String(err)
    });
  }
});

// Sobe servidor HTTP
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Pilar Mail rodando na porta ${PORT}`);
});
