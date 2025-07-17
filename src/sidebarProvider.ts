import * as vscode from "vscode";
import { I18nDecorationProvider } from "./decorationProvider";

export class I18nSidebarProvider
  implements vscode.TreeDataProvider<I18nSidebarItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    I18nSidebarItem | undefined | void
  > = new vscode.EventEmitter<I18nSidebarItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    I18nSidebarItem | undefined | void
  > = this._onDidChangeTreeData.event;

  constructor(private readonly decorator: I18nDecorationProvider) {}

  getTreeItem(element: I18nSidebarItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: I18nSidebarItem): Thenable<I18nSidebarItem[]> {
    if (!element) {
      const enabled = this.decorator.getEnabled();
      return Promise.resolve([
        new I18nSidebarItem(
          enabled ? "변환 텍스트 표시 켜짐" : "변환 텍스트 표시 꺼짐",
          "persoi18nviewer.togglePreview",
          enabled ? "eye" : "eye-closed"
        ),
        new I18nSidebarItem(
          "언어 선택",
          "persoi18nviewer.selectLanguage",
          "gear"
        ),
        new I18nSidebarItem(
          "번역 새로고침",
          "persoi18nviewer.reload",
          "refresh"
        ),
        new I18nSidebarItem(
          "번역 가져오기",
          "persoi18nviewer.fetchTranslations",
          "cloud-download"
        ),
      ]);
    }
    return Promise.resolve([]);
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

class I18nSidebarItem extends vscode.TreeItem {
  constructor(label: string, commandId: string, iconName: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: commandId,
      title: label,
    };
    this.iconPath = new vscode.ThemeIcon(iconName);
  }
}
