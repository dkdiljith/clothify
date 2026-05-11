exports.ErrorContent = async (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Not Found | Clothify</title>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background: #f9f9f9;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          color: #333;
          margin: 0;
        }
        .error-container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          width: 100%;
        }
        h1 {
          color: #ff69b4;
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        p {
          font-size: 1rem;
          margin-bottom: 2rem;
          color: #666;
        }
        .cta-button {
          background-color: #ff69b4;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
          font-size: 1.1rem;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #ff3d9e;
        }
        .info {
          margin-top: 1.5rem;
          font-size: 0.85rem;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>404 - Oops, we couldn’t find that!</h1>
        <p>The item you are looking for might have been misplaced, retired, or never existed. Let's get you back on track!</p>

        <a href="/user/home" class="cta-button">Go to Home</a>

        <div class="info">
          <p>${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString()}</p>
          <p>Request made from: ${req.ip}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  return res.status(404).send(htmlContent);
};









exports.userBlockedError = async (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Temporarily Restricted | Clothify</title>
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background: #f9f9f9;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
                color: #2d2a32;
            }
            .container {
                background: white;
                padding: 2.5rem;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 500px;
            }
            h1 {
                color: #d9534f;
                font-size: 1.8rem;
                margin-bottom: 1rem;
            }
            .message {
                font-size: 1rem;
                color: #555;
                margin-bottom: 1.5rem;
            }
            .cta-buttons a {
                display: block;
                margin: 8px auto;
                padding: 12px;
                width: 100%;
                max-width: 280px;
                background: #d9534f;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                transition: 0.2s;
                font-weight: 500;
            }
            .cta-buttons a:hover {
                background: #c9302c;
                transform: scale(1.05);
            }
            .small-text {
                margin-top: 1rem;
                font-size: 0.85rem;
                color: #777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚫 Account Restricted</h1>
            <p class="message">
                Your account has been temporarily restricted due to unusual activity. <br> 
                If this is a mistake, we’re here to help!
            </p>
            <div class="cta-buttons">
                 <a href="mailto:clothifyfashionshop@gmail.com" 
     onclick="window.open('https://mail.google.com/mail/?view=cm&fs=1&to=clothifyfashionshop@gmail.com&su=Clothify%20Support%20Request&body=Hello%20Clothify%20Team,%0A%0AI%20need%20assistance%20with...', '_blank'); return false;">
    support@clothify.com
  </a>
                <a href="/user/logout">🏠 Return Home</a>
            </div>
            <p class="small-text">
                Need assistance? Our team is available 24/7.
            </p>
        </div>
    </body>
    </html>
  `;
  return res.status(403).send(htmlContent);
};






exports.userDisabledError = async (req, res) => {
   const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deleted | Clothify</title>
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background: #f8f9fa;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
                color: #444;
            }
            .container {
                background: white;
                padding: 3.5rem 2rem;
                border-radius: 20px;
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
                text-align: center;
                max-width: 400px;
                border: 1px solid #eee;
            }
            .icon {
                font-size: 3.5rem;
                margin-bottom: 1.5rem;
                filter: grayscale(100%);
            }
            h1 {
                color: #2d3436;
                font-size: 1.6rem;
                margin-bottom: 1rem;
            }
            .message {
                font-size: 1rem;
                color: #7f8c8d;
                line-height: 1.6;
                margin-bottom: 0;
            }
            .divider {
                width: 40px;
                height: 2px;
                background: #dfe6e9;
                margin: 1.5rem auto;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🕊️</div>
            <h1>Account Deleted</h1>
            <p class="message">
                Your account and personal data have been successfully removed from Clothify.
            </p>
            <div class="divider"></div>
            <p class="message" style="font-size: 0.9rem;">
                Thank you for being a part of our community.
            </p>
        </div>
    </body>
    </html>
  `;
  return res.status(200).send(htmlContent);
};
