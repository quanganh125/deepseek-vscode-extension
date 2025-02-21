import ollama from 'ollama';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Create output channel for logging
let outputChannel: vscode.OutputChannel;
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Initialize output channel
	outputChannel = vscode.window.createOutputChannel('DeepChat');
	outputChannel.show();
	
	outputChannel.appendLine('DeepChat extension is now active!');

	const disposable = vscode.commands.registerCommand('deepchat.DeepChat', () => {
		outputChannel.appendLine('Creating webview panel...');
		const panel = vscode.window.createWebviewPanel(
      'deepChat',
      'Deep Chat',
      vscode.ViewColumn.Two,
      { 
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'))
        ],
        // Enable devtools for debugging
        enableFindWidget: true
      }
    );

    outputChannel.appendLine('Loading webview content...');
    panel.webview.html = getWebViewContent(context.extensionUri, panel.webview);

    panel.webview.onDidReceiveMessage(async (message: any) => {
      outputChannel.appendLine(`Received message from webview: ${JSON.stringify(message)}`);
      console.log('Received message from webview:', message); // Debug Console
      
      if (message.command === 'chat') {
        const userPrompt = message.text;
        let responseText = '';

        try {
          outputChannel.appendLine(`Starting chat with prompt: ${userPrompt}`);
          const streamResponse = await ollama.chat({
            model: 'deepseek-r1:1.5b',
            messages: [{ role: 'user', content: userPrompt }],
            stream: true
          });

          for await (const answer of streamResponse) {
            responseText += answer.message.content;
            panel.webview.postMessage({ command: 'chatResponse', text: responseText });
          }
        } catch (error) {
          const errorMsg = `Error in chat: ${error}`;
          outputChannel.appendLine(errorMsg);
          console.error(errorMsg); // Debug Console
          panel.webview.postMessage({ command: 'error', text: errorMsg });
        }
      } else if (message.command === 'console') {
        // Log webview console messages
        outputChannel.appendLine(`Webview console: ${message.text}`);
        console.log('Webview console:', message.text); // Debug Console
      }
    });

    // Log when panel is disposed
    panel.onDidDispose(() => {
      outputChannel.appendLine('Webview panel disposed');
    }, null, context.subscriptions);
	});

  context.subscriptions.push(disposable);
}

function getWebViewContent(extensionUri: vscode.Uri, webview: vscode.Webview): string {
  try {
    // Get file paths
    const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'webview.html');
    const cssPath = path.join(extensionUri.fsPath, 'src', 'webview', 'styles.css');
    const jsPath = path.join(extensionUri.fsPath, 'src', 'webview', 'webview.js');

    outputChannel.appendLine(`Loading files from:
      HTML: ${htmlPath}
      CSS: ${cssPath}
      JS: ${jsPath}`);

    // Convert to webview URIs
    const jsUri = webview.asWebviewUri(vscode.Uri.file(jsPath));

    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    outputChannel.appendLine('Files loaded successfully');

    htmlContent = htmlContent.replace(
      '</head>',
      `<style>${cssContent}</style>
      <script src="${jsUri}"></script>
      </head>`
    );

    return htmlContent;
  } catch (error) {
    const errorMsg = `Error loading webview content: ${error}`;
    outputChannel.appendLine(errorMsg);
    throw error;
  }
}
