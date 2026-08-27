export type AiTask = 'text' | 'vision';

export type AiProviderName = 'groq' | 'nvidia' | 'opencode' | 'openrouter' | 'zenmux' | 'gemini';

export interface AiTextPart {
  type: 'text';
  text: string;
}

export interface AiImagePart {
  type: 'image';
  mimeType: string;
  data: string;
}

export type AiContentPart = AiTextPart | AiImagePart;

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | AiContentPart[];
}

export interface AiProviderEnv {
  ENVIRONMENT?: string;
  GROQ_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  OPENCODE_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  ZENMUX_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AI_TEXT_PROVIDER_ORDER?: string;
  AI_VISION_PROVIDER_ORDER?: string;
  GROQ_TEXT_MODEL?: string;
  GROQ_VISION_MODEL?: string;
  NVIDIA_TEXT_MODEL?: string;
  NVIDIA_VISION_MODEL?: string;
  OPENCODE_TEXT_MODEL?: string;
  OPENROUTER_TEXT_MODEL?: string;
  OPENROUTER_VISION_MODEL?: string;
  ZENMUX_TEXT_MODEL?: string;
  ZENMUX_VISION_MODEL?: string;
  GEMINI_ANALYSIS_MODEL?: string;
  GEMINI_TTS_MODEL?: string;
  ALLOW_NVIDIA_TRIAL?: string;
  ALLOW_ZENMUX_PAID?: string;
}

export interface AiGenerationRequest {
  task: AiTask;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  responseSchema?: 'hermes' | 'newspaper';
  validateResponse?: (text: string) => void;
  providerTimeoutMs?: number;
  maxProviderCalls?: number;
}

export interface AiProviderAttempt {
  provider: AiProviderName;
  model: string;
  ok: boolean;
  status?: number;
  reason?: string;
}

export interface AiGenerationResult {
  provider: AiProviderName;
  model: string;
  text: string;
  attempts: AiProviderAttempt[];
}

export interface AiSpeechResult {
  provider: 'gemini';
  model: string;
  audioData: string;
  mimeType: string;
  sampleRate: number;
}

interface ProviderDefinition {
  name: AiProviderName;
  endpoint: string;
  apiKey: string;
  model: string;
  supportsVision: boolean;
  jsonMode: boolean;
  extraHeaders?: Record<string, string>;
}

const DEFAULT_TEXT_ORDER: AiProviderName[] = ['gemini', 'openrouter', 'groq', 'opencode', 'nvidia'];
const DEFAULT_VISION_ORDER: AiProviderName[] = ['groq', 'nvidia', 'gemini', 'openrouter'];
const PROVIDER_TIMEOUT_MS = 20_000;
const GEMINI_VISION_TIMEOUT_MS = 40_000;
const OPENROUTER_VISION_TIMEOUT_MS = 55_000;
const GROQ_VISION_TIMEOUT_MS = 55_000;
const NVIDIA_VISION_TIMEOUT_MS = 55_000;
const TTS_TIMEOUT_MS = 60_000;
const GEMINI_RETRY_DELAY_MS = 750;
const GEMINI_TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);

const HERMES_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isContentUnreadable: { type: 'BOOLEAN' },
    videoSlides: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceHeadline: { type: 'STRING' },
          topText: { type: 'STRING' },
          spokenText: { type: 'STRING' },
          imagePrompts: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['sourceHeadline', 'topText', 'spokenText', 'imagePrompts'],
      },
    },
    thumbnailText: { type: 'STRING' },
    sonSoz: { type: 'STRING' },
    gununSorusu: { type: 'STRING' },
    lastQuote: { type: 'STRING' },
    sourceName: { type: 'STRING' },
    gazeteBasliklari: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          baslik: { type: 'STRING' }, aciklama: { type: 'STRING' },
          onem: { type: 'NUMBER' },
          x: { type: 'NUMBER' }, y: { type: 'NUMBER' }, w: { type: 'NUMBER' }, h: { type: 'NUMBER' },
        },
        required: ['baslik', 'aciklama', 'onem', 'x', 'y', 'w', 'h'],
      },
    },
  },
  required: ['isContentUnreadable', 'videoSlides', 'thumbnailText', 'sonSoz', 'gununSorusu', 'lastQuote', 'sourceName', 'gazeteBasliklari'],
};

const NEWSPAPER_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isContentUnreadable: { type: 'BOOLEAN' },
    gazeteBasliklari: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceHeadlineId: { type: 'STRING' },
          baslik: { type: 'STRING' },
          aciklama: { type: 'STRING' },
          onem: { type: 'NUMBER' },
          x: { type: 'NUMBER' },
          y: { type: 'NUMBER' },
          w: { type: 'NUMBER' },
          h: { type: 'NUMBER' },
        },
        required: ['baslik', 'aciklama', 'onem', 'x', 'y', 'w', 'h'],
      },
    },
  },
  required: ['isContentUnreadable', 'gazeteBasliklari'],
};

function selectedResponseSchema(request: AiGenerationRequest) {
  return request.responseSchema === 'newspaper'
    ? NEWSPAPER_RESPONSE_SCHEMA
    : HERMES_RESPONSE_SCHEMA;
}

function toOpenRouterJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => toOpenRouterJsonSchema(item));
  if (!value || typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = key === 'type' && typeof item === 'string'
      ? item.toLowerCase()
      : toOpenRouterJsonSchema(item);
  }
  if (result.type === 'object' && result.additionalProperties === undefined) {
    result.additionalProperties = false;
  }
  return result;
}

async function withRequestTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = PROVIDER_TIMEOUT_MS,
  label = 'Sağlayıcı',
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new Error(`${label} ${Math.round(timeoutMs / 1000)} saniyede yanıtını tamamlamadı.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeOrder(value: string | undefined, fallback: AiProviderName[]) {
  if (!value) return fallback;
  const supported = new Set<AiProviderName>(['groq', 'nvidia', 'opencode', 'openrouter', 'zenmux', 'gemini']);
  const parsed = value
    .split(',')
    .map(item => item.trim().toLowerCase() as AiProviderName)
    .filter(item => supported.has(item));
  return parsed.length ? Array.from(new Set(parsed)) : fallback;
}

function getProviderDefinitions(env: AiProviderEnv, task: AiTask) {
  const production = env.ENVIRONMENT === 'production';
  const allowNvidiaTrial = !production || env.ALLOW_NVIDIA_TRIAL === 'true';
  const allowZenMuxPaid = env.ALLOW_ZENMUX_PAID === 'true';
  const definitions: Partial<Record<AiProviderName, ProviderDefinition>> = {
    groq: env.GROQ_API_KEY ? {
      name: 'groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: env.GROQ_API_KEY,
      model: task === 'vision'
        ? (env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b')
        : (env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b'),
      supportsVision: true,
      jsonMode: true,
    } : undefined,
    nvidia: env.NVIDIA_API_KEY && allowNvidiaTrial ? {
      name: 'nvidia',
      endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
      apiKey: env.NVIDIA_API_KEY,
      model: task === 'vision'
        ? (env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning')
        : (env.NVIDIA_TEXT_MODEL || 'nvidia/nemotron-3-nano-30b-a3b'),
      supportsVision: true,
      jsonMode: false,
      extraHeaders: { Accept: 'application/json' },
    } : undefined,
    opencode: env.OPENCODE_API_KEY ? {
      name: 'opencode',
      endpoint: 'https://opencode.ai/zen/v1/chat/completions',
      apiKey: env.OPENCODE_API_KEY,
      model: env.OPENCODE_TEXT_MODEL || 'deepseek-v4-flash-free',
      supportsVision: false,
      jsonMode: false,
    } : undefined,
    openrouter: env.OPENROUTER_API_KEY ? {
      name: 'openrouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: env.OPENROUTER_API_KEY,
      model: task === 'vision'
        ? (env.OPENROUTER_VISION_MODEL || 'openrouter/free')
        : (env.OPENROUTER_TEXT_MODEL || 'openrouter/free'),
      supportsVision: true,
      jsonMode: true,
      extraHeaders: {
        'HTTP-Referer': 'https://serefkeser.github.io/Claude/',
        'X-Title': 'Hermes OTONOM',
      },
    } : undefined,
    zenmux: env.ZENMUX_API_KEY && allowZenMuxPaid ? {
      name: 'zenmux',
      endpoint: 'https://zenmux.ai/api/v1/chat/completions',
      apiKey: env.ZENMUX_API_KEY,
      model: task === 'vision'
        ? (env.ZENMUX_VISION_MODEL || 'google/gemini-2.5-flash')
        : (env.ZENMUX_TEXT_MODEL || 'google/gemini-2.5-flash'),
      supportsVision: true,
      jsonMode: true,
    } : undefined,
    gemini: env.GEMINI_API_KEY ? {
      name: 'gemini',
      endpoint: '',
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_ANALYSIS_MODEL || 'gemini-2.5-flash',
      supportsVision: true,
      jsonMode: true,
    } : undefined,
  };

  const order = normalizeOrder(
    task === 'vision' ? env.AI_VISION_PROVIDER_ORDER : env.AI_TEXT_PROVIDER_ORDER,
    task === 'vision' ? DEFAULT_VISION_ORDER : DEFAULT_TEXT_ORDER,
  );

  return order
    .map(name => definitions[name])
    .filter((provider): provider is ProviderDefinition => Boolean(provider))
    .filter(provider => task !== 'vision' || provider.supportsVision);
}

type OpenAiContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

function toOpenAiContent(content: AiMessage['content'], supportsVision: boolean): string | OpenAiContentPart[] {
  if (typeof content === 'string') return content;

  const parts = content.flatMap<OpenAiContentPart>(part => {
    if (part.type === 'text') return [{ type: 'text', text: part.text }];
    if (!supportsVision) return [{ type: 'text', text: '[Görsel bu sağlayıcı tarafından desteklenmiyor.]' }];
    return [{
      type: 'image_url',
      image_url: { url: `data:${part.mimeType};base64,${part.data}` },
    }];
  });

  return parts;
}

function errorReason(value: unknown) {
  if (value instanceof Error) return value.message.slice(0, 500);
  return String(value || 'Bilinmeyen sağlayıcı hatası').slice(0, 500);
}

function errorStatus(value: unknown) {
  return typeof (value as { status?: unknown })?.status === 'number'
    ? (value as { status: number }).status
    : undefined;
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function providerTimeoutMs(provider: ProviderDefinition, request: AiGenerationRequest) {
  const defaultTimeout = request.task === 'vision' && provider.name === 'groq'
    ? GROQ_VISION_TIMEOUT_MS
    : request.task === 'vision' && provider.name === 'nvidia'
      ? NVIDIA_VISION_TIMEOUT_MS
      : request.task === 'vision' && provider.name === 'openrouter'
        ? OPENROUTER_VISION_TIMEOUT_MS
        : request.task === 'vision' && provider.name === 'gemini'
          ? GEMINI_VISION_TIMEOUT_MS
          : PROVIDER_TIMEOUT_MS;
  const requestedTimeout = Number(request.providerTimeoutMs || 0);
  if (!Number.isFinite(requestedTimeout) || requestedTimeout <= 0) return defaultTimeout;
  return Math.min(defaultTimeout, Math.max(1_000, Math.floor(requestedTimeout)));
}

async function callOpenAiCompatible(
  provider: ProviderDefinition,
  request: AiGenerationRequest,
  options: { plainJsonTransport?: boolean } = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    model: provider.model,
    messages: request.messages.map(message => ({
      role: message.role,
      content: toOpenAiContent(message.content, provider.supportsVision),
    })),
    temperature: request.temperature ?? 0.25,
    max_tokens: request.maxTokens ?? 4096,
    stream: false,
  };

  if (provider.name === 'groq' && request.task === 'vision' && request.responseFormat === 'json') {
    body.reasoning_effort = 'none';
    body.include_reasoning = false;
  }

  if (request.responseFormat === 'json' && provider.jsonMode && !options.plainJsonTransport) {
    if (provider.name === 'openrouter') {
      const schemaName = request.responseSchema === 'newspaper'
        ? 'otonom_newspaper'
        : 'otonom_script';
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema: toOpenRouterJsonSchema(selectedResponseSchema(request)),
        },
      };
      body.provider = { require_parameters: true, allow_fallbacks: true };
      body.plugins = [{ id: 'response-healing' }];
    } else {
      body.response_format = { type: 'json_object' };
    }
  }
  if (provider.name === 'nvidia' && request.task !== 'vision') {
    body.reasoning_budget = Math.min(2048, Math.max(256, Math.floor((request.maxTokens ?? 4096) / 3)));
  }

  return withRequestTimeout(async signal => {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        ...provider.extraHeaders,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(`${response.status} ${detail || response.statusText}`);
      Object.assign(error, { status: response.status });
      throw error;
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ text?: string }> | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    const text = (typeof content === 'string'
      ? content
      : content?.map(part => part.text || '').join('') || '').trim();
    if (!text) throw new Error('Sağlayıcı boş yanıt döndürdü.');
    return text;
  }, providerTimeoutMs(provider, request), `Sağlayıcı ${provider.name}`);
}

function toGeminiParts(content: AiMessage['content']) {
  if (typeof content === 'string') return [{ text: content }];
  return content.map(part => part.type === 'text'
    ? { text: part.text }
    : { inlineData: { mimeType: part.mimeType, data: part.data } });
}

async function callGemini(
  provider: ProviderDefinition,
  request: AiGenerationRequest,
  retryHint = false,
): Promise<string> {
  const systemText = request.messages
    .filter(message => message.role === 'system')
    .flatMap(message => typeof message.content === 'string'
      ? [message.content]
      : message.content.filter(part => part.type === 'text').map(part => part.text))
    .join('\n\n');
  const contents = request.messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: toGeminiParts(message.content),
    }));
  if (retryHint && request.responseSchema === 'newspaper') {
    contents.push({
      role: 'user',
      parts: [{
        text: 'Önceki gazete yanıtı doğrulamayı geçmedi. Aynı TEK birleşik görseli yeniden incele. Soldaki tam sayfayı ana geometri kabul et; sağ üst ve sağ alt paneller yalnız aynı sayfanın yakın planıdır. Yalnız gerçekten okuyabildiğin başlık+açıklamaları JSON şemasında döndür; sayı tamamlamak için tahmin etme.',
      }],
    });
  }
  const schema = selectedResponseSchema(request);

  return withRequestTimeout(async signal => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
          generationConfig: {
            temperature: request.temperature ?? 0.25,
            maxOutputTokens: request.maxTokens ?? 4096,
            ...(request.responseFormat === 'json'
              ? { responseMimeType: 'application/json', responseSchema: schema }
              : {}),
          },
        }),
        signal,
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const error = new Error(`${response.status} ${detail || response.statusText}`);
      Object.assign(error, { status: response.status });
      throw error;
    }

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();
    if (!text) throw new Error('Gemini boş yanıt döndürdü.');
    return text;
  }, providerTimeoutMs(provider, request), 'Sağlayıcı gemini');
}

export async function generateWithFallback(
  env: AiProviderEnv,
  request: AiGenerationRequest,
): Promise<AiGenerationResult> {
  const providers = getProviderDefinitions(env, request.task);
  if (!providers.length) {
    throw new Error('Bu görev için yapılandırılmış ücretsiz AI sağlayıcısı yok.');
  }

  const attempts: AiProviderAttempt[] = [];
  for (const provider of providers) {
    const defaultProviderCalls = provider.name === 'gemini'
      || ((provider.name === 'openrouter' || provider.name === 'groq') && request.responseFormat === 'json')
      ? 2
      : 1;
    const requestedProviderCalls = Number(request.maxProviderCalls || defaultProviderCalls);
    const providerCalls = Math.max(1, Math.min(
      defaultProviderCalls,
      Number.isFinite(requestedProviderCalls) ? Math.floor(requestedProviderCalls) : defaultProviderCalls,
    ));

    for (let callIndex = 0; callIndex < providerCalls; callIndex += 1) {
      try {
        const text = provider.name === 'gemini'
          ? await callGemini(provider, request, callIndex === 1)
          : await callOpenAiCompatible(provider, request, {
            plainJsonTransport: (provider.name === 'openrouter' || provider.name === 'groq') && callIndex === 1,
          });
        request.validateResponse?.(text);
        attempts.push({ provider: provider.name, model: provider.model, ok: true });
        return { provider: provider.name, model: provider.model, text, attempts };
      } catch (error) {
        const status = errorStatus(error);
        const reason = errorReason(error);
        const hasRetrySlot = callIndex + 1 < providerCalls;
        const retryGemini = hasRetrySlot
          && provider.name === 'gemini'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (
            (typeof status === 'number' && GEMINI_TRANSIENT_STATUSES.has(status))
            || status === undefined
          );
        const retryGroq = hasRetrySlot
          && provider.name === 'groq'
          && callIndex === 0
          && request.responseFormat === 'json'
          && status === 400
          && /json_validate_failed|failed to validate json/i.test(reason);
        const retryOpenRouter = hasRetrySlot
          && provider.name === 'openrouter'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (status === 400 || status === undefined);

        attempts.push({
          provider: provider.name,
          model: provider.model,
          ok: false,
          status,
          reason: retryGemini
            ? `${reason} · Gemini JSON yanıtı bir kez yeniden deneniyor.`
            : retryGroq
              ? `${reason} · Groq JSON doğrulaması reddedildi; response_format olmadan bir kez yeniden deneniyor, içerik doğrulaması korunuyor.`
              : retryOpenRouter
                ? `${reason} · OpenRouter structured JSON reddedildi; taşıma şeması olmadan yeniden deneniyor, içerik doğrulaması korunuyor.`
                : reason,
        });

        if (retryGemini) {
          await sleep(GEMINI_RETRY_DELAY_MS);
          continue;
        }
        if (retryGroq) continue;
        if (retryOpenRouter) continue;
        break;
      }
    }
  }

  const summary = attempts
    .map(attempt => {
      if (attempt.ok) return `${attempt.provider}: ok`;
      const status = attempt.status ? `${attempt.status}` : '';
      const reason = attempt.reason || 'başarısız';
      return `${attempt.provider}: ${[status, reason].filter(Boolean).join(' ')}`;
    })
    .join(' · ');
  const failure = new Error(`Tüm ücretsiz AI sağlayıcıları başarısız oldu.${summary ? ` ${summary}` : ''}`);
  Object.assign(failure, { attempts });
  throw failure;
}

export function getConfiguredProviders(env: AiProviderEnv) {
  const production = env.ENVIRONMENT === 'production';
  const allowNvidiaTrial = !production || env.ALLOW_NVIDIA_TRIAL === 'true';
  const allowZenMuxPaid = env.ALLOW_ZENMUX_PAID === 'true';
  return {
    groq: Boolean(env.GROQ_API_KEY),
    nvidia: Boolean(env.NVIDIA_API_KEY) && allowNvidiaTrial,
    opencode: Boolean(env.OPENCODE_API_KEY),
    openrouter: Boolean(env.OPENROUTER_API_KEY),
    zenmux: Boolean(env.ZENMUX_API_KEY) && allowZenMuxPaid,
    gemini: Boolean(env.GEMINI_API_KEY),
    nvidiaTrialAllowed: allowNvidiaTrial,
    zenmuxPaidAllowed: allowZenMuxPaid,
  };
}

export async function synthesizeSpeech(
  env: AiProviderEnv,
  text: string,
  voice = 'Aoede',
): Promise<AiSpeechResult> {
  const geminiApiKey = env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('Türkçe TTS için GEMINI_API_KEY yapılandırılmamış.');
  }

  const model = env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
  return withRequestTimeout(async signal => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
          },
        }),
        signal,
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Gemini TTS ${response.status}: ${detail || response.statusText}`);
    }

    const payload = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    };
    const inlineData = payload.candidates?.[0]?.content?.parts
      ?.find(part => part.inlineData?.data)
      ?.inlineData;
    if (!inlineData?.data) throw new Error('Gemini TTS boş ses döndürdü.');

    return {
      provider: 'gemini' as const,
      model,
      audioData: inlineData.data,
      mimeType: inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000',
      sampleRate: 24000,
    };
  }, TTS_TIMEOUT_MS, 'Gemini TTS');
}
