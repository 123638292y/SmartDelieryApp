const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (options) => {
  // CORRECTION: on vérifie tôt que les variables essentielles existent,
  // plutôt que de laisser nodemailer échouer avec une erreur peu claire.
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    console.error('Variables d\'environnement email manquantes:', {
      EMAIL_HOST: !!EMAIL_HOST,
      EMAIL_PORT: !!EMAIL_PORT,
      EMAIL_USER: !!EMAIL_USER,
      EMAIL_PASS: !!EMAIL_PASS,
    });
    throw new Error('Configuration email incomplète (vérifie le fichier .env).');
  }

  // CORRECTION: EMAIL_PORT est une chaîne de caractères venant du .env,
  // on la convertit explicitement en nombre pour nodemailer.
  const port = parseInt(EMAIL_PORT, 10);

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    secure: port === 465, // true pour le port 465 (SSL), false pour 587 (STARTTLS)
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"SmartDelivery" <${EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent.');
  }
};

module.exports = sendEmail;