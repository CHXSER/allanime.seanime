/**
 * Seanime extension core APIs (minimal declarations used by this extension).
 * Full types: https://raw.githubusercontent.com/5rahim/seanime/main/internal/extension_repo/goja_plugin_types/core.d.ts
 */
declare function fetch(url: string, options?: FetchOptions): Promise<FetchResponse>

interface FetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  noCloudflareBypass?: boolean
  timeout?: number
}

interface FetchResponse {
  status: number
  ok: boolean
  url: string
  headers: Record<string, string>
  text(): string
  json(): Promise<any>
}

declare function LoadDoc(html: string): DocSelectionFunction

interface DocSelectionFunction {
  (selector: string): DocSelection
}

declare class DocSelection {
  attr(name: string): string | undefined
  text(): string
  each(callback: (index: number, element: DocSelection) => void): DocSelection
  map<T>(callback: (index: number, element: DocSelection) => T): T[]
}
