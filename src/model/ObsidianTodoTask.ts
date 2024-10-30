import {
	AttachmentBase,
	AttachmentSession,
	ChecklistItem,
	DateTimeTimeZone,
	Extension,
	Importance,
	ItemBody,
	LinkedResource,
	NullableOption,
	PatternedRecurrence,
	TaskStatus,
	TodoTask,
} from '@microsoft/microsoft-graph-types';
import { MsTodoSyncSettings } from 'src/gui/msTodoSyncSettingTab';
import { CachedMetadata } from 'obsidian';
import MsTodoSync from './../main';
import { t } from './../lib/lang';
import { logging } from './../lib/logging';
import { IMPORTANCE_REGEX, STATUS_SYMBOL_REGEX, TASK_REGEX } from './../constants';

export class ObsidianTodoTask implements TodoTask {
	id: string;

	// The task body that typically contains information about the task.
	public body?: NullableOption<ItemBody>;
	/**
	 * The date and time when the task body was last modified. By default, it is in UTC. You can provide a custom time zone in
	 * the request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan
	 * 1, 2020 would look like this: '2020-01-01T00:00:00Z'.
	 */
	public bodyLastModifiedDateTime?: string;
	/**
	 * The categories associated with the task. Each category corresponds to the displayName property of an outlookCategory
	 * that the user has defined.
	 */
	public categories?: NullableOption<string[]>;
	// The date and time in the specified time zone that the task was finished.
	public completedDateTime?: NullableOption<DateTimeTimeZone>;
	/**
	 * The date and time when the task was created. By default, it is in UTC. You can provide a custom time zone in the
	 * request header. The property value uses ISO 8601 format. For example, midnight UTC on Jan 1, 2020 would look like this:
	 * '2020-01-01T00:00:00Z'.
	 */
	public createdDateTime?: string;
	// The date and time in the specified time zone that the task is to be finished.
	public dueDateTime?: NullableOption<DateTimeTimeZone>;
	public hasAttachments?: NullableOption<boolean>;
	// The importance of the task. Possible values are: low, normal, high.
	public importance?: Importance;
	// Set to true if an alert is set to remind the user of the task.
	public isReminderOn?: boolean;
	/**
	 * The date and time when the task was last modified. By default, it is in UTC. You can provide a custom time zone in the
	 * request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1,
	 * 2020 would look like this: '2020-01-01T00:00:00Z'.
	 */
	public lastModifiedDateTime?: string;
	// The recurrence pattern for the task.
	public recurrence?: NullableOption<PatternedRecurrence>;
	// The date and time in the specified time zone for a reminder alert of the task to occur.
	public reminderDateTime?: NullableOption<DateTimeTimeZone>;
	public startDateTime?: NullableOption<DateTimeTimeZone>;
	/**
	 * Indicates the state or progress of the task. Possible values are: notStarted, inProgress, completed, waitingOnOthers,
	 * deferred.
	 */
	public status?: TaskStatus;
	// A brief description of the task.
	public title?: NullableOption<string>;
	public attachments?: NullableOption<AttachmentBase[]>;
	public attachmentSessions?: NullableOption<AttachmentSession[]>;
	// A collection of checklistItems linked to a task.
	public checklistItems?: NullableOption<ChecklistItem[]>;
	// The collection of open extensions defined for the task. Nullable.
	public extensions?: NullableOption<Extension[]>;
	// A collection of resources linked to the task.
	public linkedResources?: NullableOption<LinkedResource[]>;

	public blockLink?: string;
	public fileName?: string;
	private plugin: MsTodoSync;
	private settings: MsTodoSyncSettings;
	logger = logging.getLogger('mstodo-sync.ObsidianTodoTask');
	private originalTitle: string;

	/**
	 *
	 */
	//constructor() {
	// this.plugin = plugin;
	// this.settings = plugin.settings;
	// this.fileName = fileName;
	// this.originalTitle = line;
	// this.logger.debug(`Creating: '${this.title}'`);
	// this.title = line.trim();
	// // This will strip out the block link if it exists as
	// // it is part of this plugin and not user specified.
	// this.checkForBlockLink(line);
	// // This will strip out the checkbox if in title.
	// this.checkForStatus(line);
	// this.checkForImportance(line);
	// this.title = this.title
	// 	.trim()
	// 	.replace(/(- \[( |x|\/)\] )|\*|^> |^#* |- /gm, '')
	// 	.trim();
	// this.body = {
	// 	content: `${t('displayOptions_CreatedInFile')} [[${this.fileName}]]`,
	// 	contentType: 'text',
	// };
	// this.logger.debug(`Created: '${this.title}'`);
	//}
	constructor(plugin: MsTodoSync, line: string, fileName: string) {
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.fileName = fileName;
		this.originalTitle = line;

		this.logger.debug(`Creating: '${this.title}'`);

		this.title = line.trim();

		// This will strip out the block link if it exists as
		// it is part of this plugin and not user specified.
		this.checkForBlockLink(line);

		// This will strip out the checkbox if in title.
		this.checkForStatus(line);

		this.checkForImportance(line);

		this.title = this.title
			.trim()
			.replace(/(- \[( |x|\/)\] )|\*|^> |^#* |- /gm, '')
			.trim();

		this.body = {
			content: `${t('displayOptions_CreatedInFile')} [[${this.fileName}]]`,
			contentType: 'text',
		};

		if (!this.linkedResources) {
			this.linkedResources = [];
		}
		this.linkedResources.push({
			webUrl: `obsidian://advanced-uri?filepath=${fileName}`,
			applicationName: 'Obsidian',
			displayName: 'fileName',
		});

		this.logger.debug(`Created: '${this.title}'`);
	}

	// static async fromLineNumber(plugin: MsTodoSync, fileName: string, lineNumber: number): Promise<ObsidianTodoTask> {
	// 	const task = new ObsidianTodoTask();

	// 	task.plugin = plugin;
	// 	task.settings = plugin.settings;
	// 	task.fileName = fileName;

	// 	const pageMetadata = plugin.getPageMetadata(fileName) as CachedMetadata;

	// 	await app.vault.read(app.vault.getAbstractFileByPath('400 Reference/HomeTech/Unraid.md'));

	// 	app.vault.read(this.config.target_file);

	// 	plugin.app.vault.getAbstractFileByPath;
	// 	pageMetadata.listItems?.find((item) => {
	// 		if (item.position.start.line === lineNumber) {
	// 			task.originalTitle = item.line;
	// 		}
	// 	});

	// 	return task;
	// }

	public getTodoTask(withChecklist = false): TodoTask {
		const toDo: TodoTask = {
			title: this.title,
		};

		if (this.body && this.body.content && this.body.content.length > 0) {
			toDo.body = this.body;
		}

		if (this.status && this.status.length > 0) {
			toDo.status = this.status;
		}

		if (this.importance && this.importance.length > 0) {
			toDo.importance = this.importance as Importance;
		}

		if (withChecklist) {
			if (this.checklistItems && this.checklistItems.length > 0) {
				toDo.checklistItems = this.checklistItems;
			}
		}

		if (this.linkedResources && this.linkedResources.length > 0) {
			toDo.linkedResources = this.linkedResources;
		}
		return toDo;
	}

	public setBody(body: string) {
		this.body = {
			content: body,
			contentType: 'text',
		};
	}

	public addChecklistItem(item: string) {
		if (!this.checklistItems) {
			this.checklistItems = [];
		}

		this.checklistItems.push({
			displayName: item
				.trim()
				.replace(/(- \[( |x|\/)\] )|\*|^> |^#* |- /gm, '')
				.trim(),
		});
	}

	/**
	 * Return the task as a well formed markdown task.
	 *
	 * @return {*}  {string}
	 * @memberof ObsidianTodoTask
	 */
	public getMarkdownTask(singleLine: boolean): string {
		let output: string;

		// Format and display the task which is the first line.
		const format = this.settings.displayOptions_ReplacementFormat;
		const priorityIndicator = this.getPriorityIndicator();

		// eslint-disable-next-line prefer-const
		output = format
			.replace(TASK_REGEX, this.title?.trim() ?? '')
			.replace(STATUS_SYMBOL_REGEX, this.getStatusIndicator());

		if (output.includes(priorityIndicator)) {
			// Already in title, don't add it again and clear replacement tag.
			output = output.replace(IMPORTANCE_REGEX, '');
		} else {
			output = output.replace(IMPORTANCE_REGEX, priorityIndicator);
		}

		// Append blocklink at the end if it exists
		if (this.hasBlockLink && this.blockLink) {
			output = `${output.trim()} ^${this.blockLink}`;
		}
		this.logger.debug(`Updated task: '${output}'`);

		let formattedBody = '';
		let formattedChecklist = '';

		// Add in the body if it exists and indented by two spaces.
		if (this.body?.content && this.body.content.length > 0) {
			this.body?.content.split('\n').forEach((bodyLine) => {
				if (bodyLine.trim().length > 0) {
					formattedBody += '  ' + bodyLine + '\n';
				}
			});
		}
		// this.logger.debug(`formattedBody: '${formattedBody}'`);

		if (this.checklistItems && this.checklistItems.length > 0) {
			this.checklistItems.forEach((item) => {
				if (item.isChecked) {
					formattedChecklist += '  - [x] ' + item.displayName + '\n';
				} else {
					formattedChecklist += '  - [ ] ' + item.displayName + '\n';
				}
			});
		}
		// this.logger.debug(`formattedChecklist: '${formattedChecklist}'`);

		if (singleLine) {
			output = `${output.trim()}`;
		} else {
			output = `${output.trim()}\n${formattedBody}${formattedChecklist}`;
		}
		// this.logger.debug(`output: '${output}'`);

		return output;
	}

	private checkForStatus(line: string) {
		const regex = /\[(.)\]/;

		const m = regex.exec(line);
		if (m && m.length > 0) {
			this.status = m[1] === 'x' ? 'completed' : 'notStarted';
			this.title = this.title?.replace(regex, '').trim();
		} else {
			this.status = 'notStarted';
		}
	}

	private checkForImportance(line: string) {
		this.importance = 'normal';

		if (line.includes(this.settings.displayOptions_TaskImportance_Low)) {
			this.importance = 'low';
		}

		if (line.includes(this.settings.displayOptions_TaskImportance_High)) {
			this.importance = 'high';
		}
	}

	private getPriorityIndicator(): string {
		switch (this.importance) {
			case 'normal':
				return this.settings.displayOptions_TaskImportance_Normal;
			case 'low':
				return this.settings.displayOptions_TaskImportance_Low;
			case 'high':
				return this.settings.displayOptions_TaskImportance_High;
			default:
				return '';
		}
	}

	private getStatusIndicator(): string {
		switch (this.status) {
			case 'notStarted':
				return this.settings.displayOptions_TaskStatus_NotStarted;
			case 'inProgress':
				return this.settings.displayOptions_TaskStatus_InProgress;
			case 'completed':
				return this.settings.displayOptions_TaskStatus_Completed;
			default:
				return ' ';
		}
	}

	private checkForBlockLink(line: string) {
		const blocklinkRegex = /\^(?!.*\^)([A-Za-z0-9]+)/gm;
		const blocklinkMatch = blocklinkRegex.exec(line);
		if (blocklinkMatch) {
			this.blockLink = blocklinkMatch[1];

			//FIXME If there's a 'Created at xxxx' replaced line,
			// it's not enough to get a cleanTaskTitle after the next line.
			this.title = this.title?.replace(`^${this.blockLink}`, '');
		}

		if (this.hasBlockLink && this.blockLink) {
			this.id = this.settings.taskIdLookup[this.blockLink];
		}
	}

	public get cleanTitle(): string {
		return '';
	}

	public get hasBlockLink(): boolean {
		return this.blockLink !== undefined && this.blockLink.length > 0;
	}

	/**
	 * Cache the ID internally and generate blocklink.
	 *
	 * @param {string} [id]
	 * @return {*}  {Promise<void>}
	 * @memberof ObsidianTodoTask
	 */
	public async cacheTaskId(id: string): Promise<void> {
		this.settings.taskIdIndex = this.settings.taskIdIndex + 1;

		const index = `${Math.random().toString(20).substring(2, 6)}${this.settings.taskIdIndex
			.toString()
			.padStart(5, '0')}`;
		this.logger.debug(`id: ${id}, index: ${index}, taskIdIndex: ${this.settings.taskIdIndex}`);

		this.settings.taskIdLookup[index] = id ?? '';
		this.blockLink = index;
		this.id = id;

		await this.plugin.saveSettings();
	}
}
