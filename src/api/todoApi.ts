import * as msal from '@azure/msal-node';
import * as msalCommon from '@azure/msal-common';
import { Client } from '@microsoft/microsoft-graph-client';
import { TodoTask, TodoTaskList } from '@microsoft/microsoft-graph-types';
import { DataAdapter, Notice } from 'obsidian';
import { MicrosoftAuthModal } from '../gui/microsoftAuthModal';
import { t } from '../lib/lang';

export class TodoApi {
	private client: Client;
	constructor() {
		new MicrosoftClientProvider().getClient().then((client) => (this.client = client));
	}
	// List operation
	async getLists(searchPattern?: string): Promise<TodoTaskList[] | undefined> {
		const endpoint = '/me/todo/lists';
		const todoLists = (await this.client.api(endpoint).get()).value as TodoTaskList[];
		return await Promise.all(
			todoLists.map(async (taskList) => {
				const containedTasks = await this.getListTasks(taskList.id, searchPattern);
				return {
					...taskList,
					tasks: containedTasks,
				};
			}),
		);
	}
	async getListIdByName(listName: string | undefined): Promise<string | undefined> {
		if (!listName) return;
		const endpoint = '/me/todo/lists';
		const res: TodoTaskList[] = (
			await this.client.api(endpoint).filter(`contains(displayName,'${listName}')`).get()
		).value;
		if (!res || res.length == 0) return;
		const target = res[0] as TodoTaskList;
		return target.id;
	}
	async getList(listId: string | undefined): Promise<TodoTaskList | undefined> {
		if (!listId) return;
		const endpoint = `/me/todo/lists/${listId}`;
		return (await this.client.api(endpoint).get()) as TodoTaskList;
	}
	async createTaskList(displayName: string | undefined): Promise<TodoTaskList | undefined> {
		if (!displayName) return;
		return await this.client.api('/me/todo/lists').post({
			displayName,
		});
	}

	// Task operation
	async getListTasks(listId: string | undefined, searchText?: string): Promise<TodoTask[] | undefined> {
		if (!listId) return;
		const endpoint = `/me/todo/lists/${listId}/tasks`;
		if (!searchText) return;
		const res = await this.client
			.api(endpoint)
			.filter(searchText)
			.get()
			.catch((err) => {
				new Notice(t('Notice_UnableToAcquireTaskFromConfiguredList'));
				return;
			});
		if (!res) return;
		return res.value as TodoTask[];
	}
	async getTask(listId: string, taskId: string): Promise<TodoTask | undefined> {
		const endpoint = `/me/todo/lists/${listId}/tasks/${taskId}`;
		return (await this.client.api(endpoint).get()) as TodoTask;
	}

	async createTaskFromToDo(listId: string | undefined, toDo: TodoTask): Promise<TodoTask> {
		const endpoint = `/me/todo/lists/${listId}/tasks`;
		return await this.client.api(endpoint).post(toDo);
	}

	async updateTaskFromToDo(listId: string | undefined, taskId: string, toDo: TodoTask): Promise<TodoTask> {
		const endpoint = `/me/todo/lists/${listId}/tasks/${taskId}`;
		return await this.client.api(endpoint).patch(toDo);
	}
}

export class MicrosoftClientProvider {
	private readonly clientId = 'a1172059-5f55-45cd-9665-8dccc98c2587';
	private readonly authority = 'https://login.microsoftonline.com/consumers';
	private readonly scopes: string[] = ['Tasks.ReadWrite', 'openid', 'profile'];
	private readonly pca: msal.PublicClientApplication;
	private readonly adapter: DataAdapter;
	private readonly cachePath: string;

	constructor() {
		this.adapter = app.vault.adapter;
		this.cachePath = `${app.vault.configDir}/Microsoft_cache.json`;

		const beforeCacheAccess = async (cacheContext: msalCommon.TokenCacheContext) => {
			if (await this.adapter.exists(this.cachePath)) {
				cacheContext.tokenCache.deserialize(await this.adapter.read(this.cachePath));
			}
		};
		const afterCacheAccess = async (cacheContext: msalCommon.TokenCacheContext) => {
			if (cacheContext.cacheHasChanged) {
				await this.adapter.write(this.cachePath, cacheContext.tokenCache.serialize());
			}
		};
		const cachePlugin = {
			beforeCacheAccess,
			afterCacheAccess,
		};
		const config = {
			auth: {
				clientId: this.clientId,
				authority: this.authority,
			},
			cache: {
				cachePlugin,
			},
		};
		this.pca = new msal.PublicClientApplication(config);
	}

	private async getAccessToken() {
		const msalCacheManager = this.pca.getTokenCache();
		if (await this.adapter.exists(this.cachePath)) {
			msalCacheManager.deserialize(await this.adapter.read(this.cachePath));
		}
		const accounts = await msalCacheManager.getAllAccounts();
		if (accounts.length == 0) {
			return await this.authByDevice();
		} else {
			return await this.authByCache(accounts[0]);
		}
	}
	private async authByDevice(): Promise<string> {
		const deviceCodeRequest = {
			deviceCodeCallback: (response: msalCommon.DeviceCodeResponse) => {
				new Notice(t('Notice_DeviceCodeOnClipboard'));
				navigator.clipboard.writeText(response['userCode']);
				new MicrosoftAuthModal(response['userCode'], response['verificationUri']).open();
				console.log(t('Notice_DeviceCodeCopiedToClipboard'), response['userCode']);
			},
			scopes: this.scopes,
		};
		return await this.pca.acquireTokenByDeviceCode(deviceCodeRequest).then((res) => {
			return res == null ? 'error' : res['accessToken'];
		});
	}

	private async authByCache(account: msal.AccountInfo): Promise<string> {
		const silentRequest = {
			account: account,
			scopes: this.scopes,
		};
		return await this.pca
			.acquireTokenSilent(silentRequest)
			.then((res) => {
				return res == null ? 'error' : res['accessToken'];
			})
			.catch(async (err) => {
				return await this.authByDevice();
			});
	}

	public async getClient() {
		const authProvider = async (callback: (arg0: string, arg1: string) => void) => {
			const accessToken = await this.getAccessToken();
			const error = ' ';
			callback(error, accessToken);
		};
		return Client.init({
			authProvider,
		});
	}
}
