// utils/sendEmail.js
import nodemailer from "nodemailer";

const sendEmail = async (opts, subj, msg) => {
  try {
    // Support two calling styles for backward compatibility:
    // 1) sendEmail({ email, subject, message })
    // 2) sendEmail(email, subject, message)
    let email, subject, message;
    if (typeof opts === "string") {
      email = opts;
      subject = subj;
      message = msg;
    } else if (opts && typeof opts === "object") {
      ({ email, subject, message } = opts);
    }

    const user = process.env.EMAIL_USER;
    const useOAuth = String(process.env.EMAIL_USE_OAUTH2 || "false").toLowerCase() === "true";

    if (!user) {
      const err = new Error('Missing `EMAIL_USER` environment variable.');
      console.error(err.message);
      throw err;
    }

    let transporter;

    if (useOAuth) {
      // OAuth2 path: requires CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;
      const refreshToken = process.env.REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        const err = new Error(
          'Missing OAuth2 credentials. Set `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` when `EMAIL_USE_OAUTH2=true`.'
        );
        console.error(err.message);
        throw err;
      }

      // Nodemailer handles OAuth2 token refresh automatically
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user,
          clientId,
          clientSecret,
          refreshToken,
        },
      });
    } else {
      // App password / plain login path
      const pass = process.env.EMAIL_PASS;
      if (!pass) {
        const err = new Error(
          'Missing `EMAIL_PASS`. Use a Gmail App Password or enable `EMAIL_USE_OAUTH2` with OAuth2 creds.'
        );
        console.error(err.message);
        throw err;
      }

      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user,
          pass,
        },
      });
    }

    if (!email) {
      const err = new Error("No recipients defined. Provide a recipient email address.");
      console.error(err.message);
      throw err;
    }

    const mailOptions = {
      from: `"SafarX" <${user}>`,
      to: email,
      subject,
      html: message,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! MessageId:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email not sent!", error && error.message ? error.message : error);
    throw error;
  }
};

export default sendEmail;
