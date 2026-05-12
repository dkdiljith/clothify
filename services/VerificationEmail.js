 var nodemailer = require(`nodemailer`)

 //MESSAGE_CONSTANTS
const MESSAGES = require(`../services/constants`)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
 exports.verificationEmailSend = async (email, verificationToken) => {
    try {
      require("dotenv").config();
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: "clothifyfashionshop@gmail.com",
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN
        }
      });
  
      const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no">
        <meta name="x-apple-disable-message-reformatting">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #f7f7f7; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #ff69b4; padding-bottom: 20px; margin-bottom: 25px; }
          .logo { max-width: 180px; }
          .code-box { background: #fff0f6; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; border: 2px dashed #ff69b4; }
          .verification-code { font-size: 2.5em; letter-spacing: 3px; color: #ff3d9e; font-weight: 700; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
          .cta-button { display: inline-block; background: #ff69b4; color: white !important; padding: 12px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://i.postimg.cc/cLs5tfxM/Clothify-logo.png" alt="Clothify Logo" class="logo">
            <h1 style="color: #2d2a32; margin-top: 20px;">Your Verification Code</h1>
          </div>
  
          <p style="font-size: 16px; color: #444;">Hi there,</p>
          <p style="font-size: 16px; color: #444;">Please use this verification code to complete your sign-in:</p>
  
          <div class="code-box">
            <div class="verification-code">${verificationToken}</div>
            <p style="display:none !important; opacity:0; color:transparent; mso-hide:all;">
  Verification code: ${verificationToken} for ${email}
</p>
          </div>
  
          <p style="font-size: 16px; color: #444;">If you didn't request this code, please ignore this email or contact our support team.</p>
  
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:clothifyfashionshop@gmail.com" style="color: #ff69b4; text-decoration: none;">clothifyfashionshop@gmail.com</a></p>
            <div style="margin-top: 15px;">
              <a href="https://clothify.com" style="color: #ff69b4; text-decoration: none; margin: 0 10px;">Our Website</a>
              <a href="https://instagram.com/clothify" style="color: #ff69b4; text-decoration: none; margin: 0 10px;">Instagram</a>
            </div>
            <p style="margin-top: 20px;">© ${new Date().getFullYear()} Clothify. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
      `;
  
      const mailOptions = {
        from: '"Clothify Fashion Team" <clothifyfashionshop@gmail.com>',
        to: email,
        subject: 'Clothify Account Verification Code (Valid for 15 minutes)', // Clean subject
        replyTo: 'no-reply@clothify.com',
        headers: {
          'X-Entity-RefID': 'CLOTHIFY_VERIFICATION_1.0',
          'List-Unsubscribe': '<mailto:unsubscribe@clothify.com>, <https://clothify.com/unsubscribe>',
          'X-Mailer': 'ClothifyVerificationSystem/1.0'
        },
        html: htmlContent,
        text: `Your Clothify verification code is: ${verificationToken}\n\nThis code expires in 15 minutes.\n\nNeed help? Contact support@clothify.com`,
        priority: 'high',
        list: {
          unsubscribe: {
            url: 'https://clothify.com/unsubscribe',
            comment: 'Unsubscribe from verification emails'
          }
        }
      };
  
       await transporter.sendMail(mailOptions);
       console.log(verificationToken)
      return { success: true, message: "Verification email sent successfully" };
    } catch (error) {
      console.error("Error sending email:", error);
      return { 
        success: false, 
        message: "Failed to send verification email",
        error: error.message // Return only error message for security
      };
    }
  };