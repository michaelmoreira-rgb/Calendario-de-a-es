import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io', // Default to Mailtrap for dev
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  templateName: string,
  context: any
) => {
  try {
    // 1. Read Template
    // Use path.resolve which resolves relative to CWD, avoiding direct process.cwd() call
    const templatePath = path.resolve('server', 'templates', `${templateName}.hbs`);
    
    // In a production build, ensure templates are copied to build dir or use a different strategy
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const source = fs.readFileSync(templatePath, 'utf-8');

    // 2. Compile Template
    const template = handlebars.compile(source);
    const html = template(context);

    // 3. Send Email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Calendário de Ações" <no-reply@calendario.com>',
      to,
      subject,
      html,
    });

    console.log(`Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Depending on requirements, we might throw or just log
    // throw error; 
  }
};