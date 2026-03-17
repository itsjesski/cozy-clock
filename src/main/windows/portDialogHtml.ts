import { DEFAULT_SERVER_PORT, MAX_SERVER_PORT, MIN_SERVER_PORT } from '../../shared/serverPort'

export function buildPortConflictDialogHtml(conflictPort: number, darkMode: boolean): string {
  const background = darkMode ? '#1e1e1e' : '#fff'
  const foreground = darkMode ? '#e0e0e0' : '#000'
  const inputBackground = darkMode ? '#2d2d2d' : '#fff'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 20px;
      background: ${background};
      color: ${foreground};
    }
    h1 { font-size: 18px; margin-top: 0; }
    p { margin: 12px 0; font-size: 14px; }
    .port-num { font-weight: bold; color: #007acc; }
    .input-group {
      margin: 20px 0;
      display: flex;
      gap: 8px;
      align-items: center;
    }
    input {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      width: 100px;
      background: ${inputBackground};
      color: ${foreground};
    }
    .buttons {
      display: flex;
      gap: 8px;
      margin-top: 24px;
      justify-content: flex-end;
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      background: #007acc;
      color: white;
    }
    button:hover { background: #005a9e; }
    button.secondary {
      background: #666;
    }
    button.secondary:hover { background: #555; }
  </style>
</head>
<body>
  <h1>⚠️ Port Already in Use</h1>
  <p>The server port <span class="port-num" id="portNum">${conflictPort}</span> is already in use by another application.</p>
  <p>Enter a different port number to continue:</p>
  <div class="input-group">
    <input type="number" id="newPort" min="${MIN_SERVER_PORT}" max="${MAX_SERVER_PORT}" value="${DEFAULT_SERVER_PORT + 1}" />
  </div>
  <div class="buttons">
    <button class="secondary" id="cancelBtn">Cancel</button>
    <button id="restartBtn">Update & Restart</button>
  </div>
  <script>
    const input = document.getElementById('newPort');
    const restartBtn = document.getElementById('restartBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    input.focus();
    input.select();

    restartBtn.onclick = () => {
      const port = Number(input.value);
      if (Number.isInteger(port) && port >= ${MIN_SERVER_PORT} && port <= ${MAX_SERVER_PORT}) {
        window.electronAPI?.updateServerPort(port);
      }
    };

    cancelBtn.onclick = () => {
      window.electronAPI?.cancelPortChange();
    };
  </script>
</body>
</html>
  `
}
