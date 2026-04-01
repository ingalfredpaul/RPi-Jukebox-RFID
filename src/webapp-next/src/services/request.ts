import { getSocket } from './socket';
import { getCommand, type CommandName } from './commands';

export interface RequestResult<T = unknown> {
  result?: T;
  error?: string;
}

export async function request<T = unknown>(
  command: CommandName,
  kwargs: Record<string, unknown> = {},
): Promise<RequestResult<T>> {
  try {
    const { package: pkg, plugin, method } = getCommand(command);
    const result = await getSocket().request(pkg, plugin, method, kwargs);
    return { result: result as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Request] ${command} failed:`, message);
    return { error: message };
  }
}
