import { Modal } from 'obsidian';
import { t } from './../lib/lang';

export class MicrosoftAuthModal extends Modal {
	constructor(private readonly deviceCode: string, private readonly authUrl: string) {
		super(app);
	}
	onOpen(): void {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass('auth-modal');

		contentEl.createEl('h2', { text: t('Auth_Heading_VerificationRequiredForFirstUse') });
		// contentEl.createEl("span",{text:`设备代码 ${this.deviceCode} 已复制到剪贴板`})
		contentEl.createEl('h4', { text: this.deviceCode });
		// contentEl.createEl("span",{text:`设备代码已复制到剪贴板`})
		contentEl.createEl('div', { text: t('Auth_Text_CodeCopiedClipboard') });
		contentEl.createEl('a', { text: this.authUrl, href: this.authUrl });
		contentEl.createEl('hr');
	}
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
