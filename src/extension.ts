import * as vscode from 'vscode';
import { MyMindEditorProvider } from './MyMindEditor';
//import { PawDrawEditorProvider } from './pawDrawEditor';

export function activate(context: vscode.ExtensionContext) {
	// Register our custom editor providers
	context.subscriptions.push(MyMindEditorProvider.register(context));
//	context.subscriptions.push(PawDrawEditorProvider.register(context));
}
