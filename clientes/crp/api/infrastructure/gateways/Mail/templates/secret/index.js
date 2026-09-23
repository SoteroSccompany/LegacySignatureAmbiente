

const genMail = data => {

  const mail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
  <style>
    body {
      background-color: #f5f5f5;
      font-family: 'Arial', sans-serif;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      border: 1px solid #e0e0e0;
    }
    .title {
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #2a6abf; /* Azul */
    }
    .message {
      margin-bottom: 32px;
      font-size: 18px;
    }
    .button {
      display: inline-block;
      background-color: #2a6abf; /* Azul */
      color: #ffffff;
      text-decoration: white;
      padding: 10px 20px;
      border-radius: 25px;
      text-decoration: none;
      font-weight: bold;
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: #8790e5;
    }
    .text-gray {
      color: #888888;
      font-size: 14px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1 class="title">Código verificação em duas etapas</h1>
      <p class="message">${data.title}</p>
      <p class="message">Código: ${data.secret}</p>
      <p class="message">Observação: O código de autenticação é válido por 1 minuto.</p>
      <p class="text-gray">Net Sign</p>
    </div>
  </div>
</body>
</html>

`
  return mail
}
module.exports = genMail;