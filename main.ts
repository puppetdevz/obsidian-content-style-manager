import { App, Editor, MarkdownView, Menu, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian'
import Markdownit from 'markdown-it'
import { mdx } from '@mdx-js/mdx'
import React from 'react'
import ReactDOMServer from 'react-dom/server'

// Remember to rename these classes and interfaces!

interface ContentStyleManagerPluginSettings {
  mySetting: string
  debugMode: boolean
}

const DEFAULT_SETTINGS: ContentStyleManagerPluginSettings = {
  mySetting: 'default',
  debugMode: true
}

export default class ContentStyleManagerPlugin extends Plugin {
  settings: ContentStyleManagerPluginSettings

  debug() {
    if (this.settings.debugMode) {
      const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor
      // Object.defineProperty(this.app,'editor',{value:editor})
      // window['editor'] = editor
      console.log('Add property editor')
    }
  }

  log(...args: any[]) {
    if (this.settings.debugMode) {
      new Notice(args.join(''))
    }
  }

  async getCurrentThemeStyles(): Promise<string> {
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('')
        } catch (e) {
          console.error('Could not access stylesheet: ', e)
          return ''
        }
      })
      .join('')
    return styles
  }

  async applyThemeStyles(html: string): Promise<string> {
    const themeStyles = await this.getCurrentThemeStyles()
    return `
        <html>
        <head>
        <style>${themeStyles}</style>
        </head>
        <body>${html}</body>
        </html>
		`
  }

  async convertMdxToHtml(mdxContent: string): Promise<string> {
    const jsxCode = await mdx(mdxContent)
    const Component = new Function('React', 'props', `${jsxCode}; return MDXContent`)(React, {})
    const html = ReactDOMServer.renderToString(React.createElement(Component))
    return html
  }

  convertMarkdownToHtml(markdown: string): string {
    // 使用markdown-it将Markdown转换为HTML
    const md = new Markdownit()
    return md.render(markdown)
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      this.log('Failed to copy text: ', error)
    }
  }

  async onload() {
    await this.loadSettings()

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
        menu.addItem(item => {
          item
            .setTitle('Copy with Style')
            .setIcon('copy')
            .onClick(async () => {
              const selectedText = editor.getSelection()
              // this.log('Selected text:', selectedText);
              if (selectedText) {
                const htmlContent = this.convertMarkdownToHtml(selectedText)
                const styledHtml = await this.applyThemeStyles(htmlContent)
                // this.log('HTML content:', htmlContent);
                await this.copyToClipboard(htmlContent)
                new Notice('Copied with style!')
              } else {
                new Notice('No text selected.')
              }
            })
        })
      })
    )
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: ContentStyleManagerPlugin;

// 	constructor(app: App, plugin: ContentStyleManagerPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
