"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const ollama_1 = __importDefault(require("ollama"));
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Create output channel for logging
let outputChannel;
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Initialize output channel
    outputChannel = vscode.window.createOutputChannel('DeepChat');
    outputChannel.show();
    outputChannel.appendLine('DeepChat extension is now active!');
    const disposable = vscode.commands.registerCommand('deepchat.DeepChat', () => {
        outputChannel.appendLine('Creating webview panel...');
        const panel = vscode.window.createWebviewPanel('deepChat', 'Deep Chat', vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'))
            ],
            // Enable devtools for debugging
            enableFindWidget: true
        });
        outputChannel.appendLine('Loading webview content...');
        panel.webview.html = getWebViewContent(context.extensionUri, panel.webview);
        panel.webview.onDidReceiveMessage(async (message) => {
            outputChannel.appendLine(`Received message from webview: ${JSON.stringify(message)}`);
            console.log('Received message from webview:', message); // Debug Console
            if (message.command === 'chat') {
                const userPrompt = message.text;
                let responseText = '';
                try {
                    outputChannel.appendLine(`Starting chat with prompt: ${userPrompt}`);
                    const streamResponse = await ollama_1.default.chat({
                        model: 'deepseek-r1:1.5b',
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true
                    });
                    for await (const answer of streamResponse) {
                        responseText += answer.message.content;
                        panel.webview.postMessage({ command: 'chatResponse', text: responseText });
                    }
                }
                catch (error) {
                    const errorMsg = `Error in chat: ${error}`;
                    outputChannel.appendLine(errorMsg);
                    console.error(errorMsg); // Debug Console
                    panel.webview.postMessage({ command: 'error', text: errorMsg });
                }
            }
            else if (message.command === 'console') {
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
function getWebViewContent(extensionUri, webview) {
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
        htmlContent = htmlContent.replace('</head>', `<style>${cssContent}</style>
      <script src="${jsUri}"></script>
      </head>`);
        return htmlContent;
    }
    catch (error) {
        const errorMsg = `Error loading webview content: ${error}`;
        outputChannel.appendLine(errorMsg);
        throw error;
    }
}
//# sourceMappingURL=extension.js.map