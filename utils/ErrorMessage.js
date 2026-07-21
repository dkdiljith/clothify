exports.ErrorContent = async (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - Not Found | Clothify</title>
        <link rel="stylesheet" href="https://googleapis.com">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Inter', sans-serif;
                background-color: #0a0a0a;
                background-image: 
                    radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
                    radial-gradient(at 100% 100%, hsla(340,10%,15%,1) 0, transparent 50%);
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                color: #ffffff;
                overflow: hidden;
            }
            .canvas {
                text-align: center;
                max-width: 600px;
                width: 90%;
                padding: 2rem;
            }
            .brand-tag {
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4em;
                color: #888888;
                margin-bottom: 2rem;
                display: block;
            }
            .error-code {
                font-size: 8.5rem;
                font-weight: 300;
                line-height: 1;
                margin-bottom: 1rem;
                letter-spacing: -0.06em;
                background: linear-gradient(180deg, #ffffff 30%, #444444 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            h1 {
                font-size: 1.1rem;
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                color: #e5e5e5;
                margin-bottom: 1.5rem;
            }
            p {
                font-size: 0.95rem;
                line-height: 1.7;
                margin-bottom: 3.5rem;
                color: #8e8e93;
                font-weight: 300;
            }
            .cta-wrapper {
                display: inline-block;
                position: relative;
            }
            .cta-button {
                background-color: #ffffff;
                color: #000000;
                padding: 16px 40px;
                border-radius: 40px;
                text-decoration: none;
                display: inline-block;
                font-size: 0.85rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.2em;
                transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                box-shadow: 0 4px 24px rgba(255, 255, 255, 0.1);
            }
            .cta-button:hover {
                transform: translateY(-2px);
                background-color: #f0f0f0;
                box-shadow: 0 8px 32px rgba(255, 255, 255, 0.2);
            }
            .meta-timeline {
                margin-top: 6rem;
                display: flex;
                justify-content: center;
                gap: 2rem;
                font-size: 0.7rem;
                color: #444444;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                padding-top: 2rem;
            }
            .meta-item span {
                color: #666666;
            }
        </style>
    </head>
    <body>
        <div class="canvas">
            <span class="brand-tag">Clothify Studio</span>
            <div class="error-code">404</div>
            <h1>The piece is missing</h1>
            <p>The archival item or editorial collection you requested cannot be located. It may have been curated out or temporarily moved.</p>
            <div class="cta-wrapper">
                <a href="/user/home" class="cta-button">Return to Index</a>
            </div>
            <div class="meta-timeline">
                <div class="meta-item">Loc <span>${req.ip}</span></div>
                <div class="meta-item">Ref <span>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            </div>
        </div>
    </body>
    </html> `;
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



