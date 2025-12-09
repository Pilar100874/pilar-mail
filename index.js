import fs from "fs";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
app.use(express.json());

// ========= FUNÇÕES BASE =========
async function sendMail(account, to, subject, text) {
  const transporter = nodemailer.createTransport({
    host: account.smtp,
    port: account.smtp_port,
    secure: account.smtp_port === 465,
    auth: { user: account.user, pass: account.pass },
  });

  const info = await transporter.sendMail({
    from: account.user,
    to,
    subject,
    text,
  });

  console.log(`📤 Email enviado por: ${account.user} - ID: ${info.messageId}`);
  return info.messageId;
}

async function checkMail(account) {
  const client = new ImapFlow({
    host: account.imap,
    port: account.imap_port,
    secure: true,
    auth: { user: account.user, pass: account.pass },
  });

  await client.connect();
  console.log(`📥 Conectado ao IMAP: ${account.user}`);

  let lock = await client.getMailboxLock("INBOX");
  const subjects = [];

  try {
    for await (let msg of client.fetch("1:*", { envelope: true })) {
      const subject = msg.envelope.subject;
      subjects.push(subject);
      console.log(`📩 ${account.user} → ${subject}`);
    }
  } finally {
    lock.release();
  }

  await client.logout();
  return subjects;
}

// ========= ROTA PARA LOVABLE =========
// Lovable envia JSON com { accounts: [...], to, subject, text }
app.post("/send-emails", async (req, res) => {
  try {
    let { accounts, to, subject, text } = req.body;

    // Se não vier accounts na requisição, tenta carregar do arquivo (opcional)
    if (!accounts || !accounts.length) {
      if (!process.env.EMAILS_CONFIG) {
        return res.status(400).json({ error: "Sem accounts e sem EMAILS_CONFIG" });
      }
      const path = process.env.EMAILS_CONFIG;
      console.log("Carregando contas de:", path);
      const raw = fs.readFileSync(path, "utf8");
      accounts = JSON.parse(raw);
    }

    const results = [];

    for (const account of accounts) {
      const msgId = await sendMail(
        account,
        to || account.user,
        subject || "Teste via API",
        text || "Mensagem de teste via Lovable"
      );
      const subjects = await checkMail(account);

      results.push({
        user: account.user,
        messageId: msgId,
        lastSubjects: subjects.slice(-5),
      });
    }

    res.json({ ok: true, results });
  } catch (err) {
    console.error("❌ Erro /send-emails:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ========= INICIAR SERVIDOR =========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 API de e-mail rodando na porta", PORT);
});

start();
