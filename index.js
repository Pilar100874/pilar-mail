import fs from "fs";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // carrega o EMAILS_CONFIG

// Carrega lista de e-mails
const accounts = JSON.parse(fs.readFileSync(process.env.EMAILS_CONFIG, "utf8"));

// ========= ENVIAR E-MAIL =========
async function sendMail(account, to, subject, text) {
  const transporter = nodemailer.createTransport({
    host: account.smtp,
    port: account.smtp_port,
    secure: account.smtp_port === 465, // SSL automático
    auth: { user: account.user, pass: account.pass }
  });

  const info = await transporter.sendMail({
    from: account.user,
    to,
    subject,
    text
  });

  console.log(`📤 Email enviado por: ${account.user} - ID: ${info.messageId}`);
}

// ========= LER E-MAIL =========
async function checkMail(account) {
  const client = new ImapFlow({
    host: account.imap,
    port: account.imap_port,
    secure: true,
    auth: { user: account.user, pass: account.pass }
  });

  await client.connect();
  console.log(`📥 Conectado ao IMAP: ${account.user}`);

  let lock = await client.getMailboxLock("INBOX");
  try {
    for await (let msg of client.fetch("1:*", { envelope: true })) {
      console.log(`📩 ${account.user} → ${msg.envelope.subject}`);
    }
  } finally {
    lock.release();
  }

  await client.logout();
}


// ========= EXECUÇÃO PRINCIPAL =========
async function start() {
  for (const account of accounts) {
    await sendMail(account, "teste@exemplo.com", "Teste Multi Email", "Funcionou ✔");
    await checkMail(account);
  }
}

start();
