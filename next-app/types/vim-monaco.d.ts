// vim-monaco ships types, but its package.json "exports" has no "types" condition, so TypeScript's bundler resolution cannot find them.
declare module 'vim-monaco' {
  export type IStatusBar = object;
  export function makeDomStatusBar(parent: HTMLElement, setFocus?: () => void): IStatusBar;
  export class VimMode {
    constructor(editor: import('monaco-editor').editor.IStandaloneCodeEditor, statusBar?: IStatusBar);
    readonly attached: boolean;
    enable(): void;
    disable(): void;
  }
}