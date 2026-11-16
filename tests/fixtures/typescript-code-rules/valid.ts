export function greet(name: string): string {
  const normalizedName = name.trim();
  if (normalizedName === '') {
    return 'Hello, world';
  }
  return `Hello, ${normalizedName}`;
}

export function head(items: string[]) {
  if (items.length) {
    return items[0].toUpperCase();
  }
  return undefined;
}

interface Example {
  property?: string;
  bar?: { baz: string };
}

export function checkExample(foo: Example) {
  const includesBaz = foo.property?.includes('baz') ?? false;
  return includesBaz && foo.bar?.baz;
}

export class BaseNode {
  value = '';

  setValue(value: string) {
    this.value = value;
  }
}

export class TextNode extends BaseNode {
  textContent = '';

  setValue(value: string) {
    super.setValue(value);
    this.textContent = value;
  }
}

export function runWorkflow(input: string) {
  const options = { input };
  const result = options.input.trim();
  return result;
}

export async function processWhile(
  hasMore: () => Promise<boolean>,
  processNext: () => Promise<void>,
) {
  while (await hasMore()) {
    await processNext();
  }
}

export interface Config {
  value: string;
}

export declare function readConfig(tenantId: string): Promise<Config>;
