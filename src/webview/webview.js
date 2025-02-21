const vscode = acquireVsCodeApi();

// Add error handling for DOM elements
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with id '${id}' not found`);
        return null;
    }
    return element;
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Webview loaded');
    
    const askButton = getElement('askButton');
    const promptInput = getElement('prompt');
    const responseDiv = getElement('response');

    if (askButton && promptInput && responseDiv) {
        askButton.addEventListener('click', () => {
            const text = promptInput.value;
            console.log('Sending message:', text);
            vscode.postMessage({ command: 'chat', text });
        });
    }
});

window.addEventListener('message', event => {
    console.log('Received message:', event.data);
    const { command, text } = event.data;
    
    if (command === 'chatResponse') {
        const responseDiv = getElement('response');
        if (responseDiv) {
            responseDiv.innerText = text;
        }
    } else if (command === 'error') {
        console.error('Error:', text);
        const responseDiv = getElement('response');
        if (responseDiv) {
            responseDiv.innerText = `Error: ${text}`;
        }
    }
});