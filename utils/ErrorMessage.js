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









exports.userUnavailableError = async (req, res) => {
 const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Status | Clothify</title>
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background: #f8f9fa;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
                color: #2d3436;
            }
            .container {
                background: white;
                padding: 3rem 2.5rem;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
                text-align: center;
                max-width: 450px;
                border: 1px solid #eaeaea;
            }
            .icon {
                font-size: 3rem;
                margin-bottom: 1.2rem;
            }
            h1 {
                color: #2d3436;
                font-size: 1.6rem;
                margin-bottom: 1rem;
            }
            .message {
                font-size: 1rem;
                color: #636e72;
                line-height: 1.6;
                margin-bottom: 2rem;
            }
            .cta-buttons a {
                display: block;
                margin: 10px auto;
                padding: 12px;
                width: 100%;
                max-width: 280px;
                background: #2d3436;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                transition: 0.2s;
                font-weight: 500;
                font-size: 0.95rem;
            }
            .cta-buttons a:hover {
                background: #000000;
            }
            .cta-buttons .secondary-btn {
                background: transparent;
                color: #636e72;
                border: 1px solid #dfe6e9;
            }
            .cta-buttons .secondary-btn:hover {
                background: #f8f9fa;
                color: #2d3436;
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
            <div class="icon">✨</div>
            <h1>Account Notice</h1>
            <p class="message">
                Your profile is no longer active on Clothify. If this update is unexpected 
                or if you require further details regarding your data, please contact our support team.
            </p>
            <div class="cta-buttons">
                <a href="mailto:clothifyfashionshop@gmail.com" 
                   onclick="window.open('https://mail.google.com/mail/?view=cm&fs=1&to=clothifyfashionshop@gmail.com&su=Clothify%20Support%20Request&body=Hello%20Clothify%20Team,%0A%0AI%20need%20assistance%20with...', '_blank'); return false;">
                   ✉️ Contact Support
                </a>
                <a href="/user/logout" class="secondary-btn">🏠 Return Home</a>
            </div>
            <div class="divider"></div>
            <p class="message" style="font-size: 0.85rem; margin-bottom: 0;">
                Thank you for being a part of our community.
            </p>
        </div>
    </body>
    </html>
  `;
  return res.status(403).send(htmlContent);
};



