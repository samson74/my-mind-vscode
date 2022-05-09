import * as vscode from 'vscode';
import { getNonce } from './util';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Provider for cat scratch editors.
 * 
 * Cat scratch editors are used for `.cscratch` files, which are just json files.
 * To get started, run this extension and open an empty `.cscratch` file in VS Code.
 * 
 * This provider demonstrates:
 * 
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Synchronizing changes between a text document and a custom editor.
 */
export class MyMindEditorProvider implements vscode.CustomTextEditorProvider {

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new MyMindEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(MyMindEditorProvider.viewType, provider);
		return providerRegistration;
	}

	private static readonly viewType = 'mindmap.mymind';

	constructor(
		private readonly context: vscode.ExtensionContext
	) { }

	/**
	 * Called when our custom editor is opened.
	 * 
	 * 
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		const mapCss = this.getMapCss();

		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
		}
		function updateMapCss() {
			webviewPanel.webview.postMessage({
				type: 'updateMapCss',
				text: mapCss,
			});
		}

		// Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		// 
		// Remember that a single text document can also be shared between multiple custom
		// editors (this happens for example when you split a custom editor)

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				//updateWebview();
			}
		});

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		// Receive message from the webview.
		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'changed':
					this.updateTextDocument(document, e.data);
					return;
	
				case 'ready':
					updateMapCss();
					updateWebview();
					return;
			}
		});

		//updateWebview();
	}

	/**
	 * Get the static map.css file content.
	 */
	private getMapCss(): string {
		// Local path to script and css for the webview
		const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'mymind', 'map.css'));
		const fileContent =
		process.platform === 'win32'
			? fs.readFileSync(onDiskPath.path.slice(1)).toString()
			: fs.readFileSync(onDiskPath.path).toString();

		return fileContent;
	}
	/**
	 * Get the static html used for the mymind editor webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
		const onDiskPath = vscode.Uri.file(path.join(this.context.extensionPath, 'mymind', 'index.html'));
		const fileContent =
		process.platform === 'win32'
			? fs.readFileSync(onDiskPath.path.slice(1)).toString()
			: fs.readFileSync(onDiskPath.path).toString();

		// vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
		const dirPath = path.join(this.context.extensionPath, 'mymind');//path.dirname(resourcePath);
		const html = fileContent.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
			return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
		});

		return html;
	}

	/**
	 * Try to get a current document as json text.
	 */
	private getDocumentAsJson(document: vscode.TextDocument): any {
		const text = document.getText();
		if (text.trim().length === 0) {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch {
			throw new Error('Could not get document as json. Content is not valid json');
		}
	}

	/**
	 * Write out the json to a given document.
	 */
/*	private updateTextDocument(document: vscode.TextDocument, json: any) {
		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			JSON.stringify(json, null, 2));

		return vscode.workspace.applyEdit(edit);
	}*/
	/**
	 * Write out the json to a given document.
	 */
	private updateTextDocument(document: vscode.TextDocument, text: string) {
		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			text);

		return vscode.workspace.applyEdit(edit);
	}
}
