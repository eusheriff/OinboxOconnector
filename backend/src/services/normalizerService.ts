/**
 * NormalizerService - Padroniza mensagens de todos os canais sociais
 * para o formato unificado do Oconnector Inbox.
 *
 * Canais suportados:
 * - Facebook Messenger
 * - Instagram Direct
 * - X (Twitter) DMs
 * - Telegram
 * - TikTok Messaging
 * - Line
 */

import { SocialChannelProvider, ChannelProvider } from '../../../shared/types';

// Interfaces para payloads raw das plataformas
interface FacebookMessagingPayload {
  sender?: { id: string };
  recipient?: { id: string };
  message?: {
    mid?: string;
    text?: string;
    attachments?: Array<{ type: string; payload?: Record<string, unknown>; url?: string }>;
    reply_to?: { mid?: string };
  };
  timestamp?: number;
  is_echo?: boolean;
}

interface InstagramMessagingPayload {
  sender?: { id: string };
  recipient?: { id: string };
  message?: {
    mid?: string;
    text?: string;
    attachments?: Array<{ type: string; payload?: Record<string, unknown>; url?: string }>;
  };
  timestamp?: number;
  is_echo?: boolean;
}

interface XDirectMessagePayload {
  id?: string;
  type?: string;
  created_timestamp?: number | string;
  message_create?: {
    sender_id?: string;
    target?: { recipient_id?: string };
    message_data?: {
      text?: string;
      attachment?: {
        media?: {
          media_url_https?: string;
          url_expanded_pic?: string;
          ext_media_type?: string;
        };
      };
    };
  };
  direct_message_events?: Array<Record<string, unknown>>;
}

interface TikTokEventPayload {
  event_id?: string;
  type?: string;
  create_time?: number | string;
  sender?: { open_id?: string };
  recipient?: { open_id?: string };
  event?: {
    message?: {
      text?: string;
      message_type?: string;
      attachment?: {
        type?: string;
        image_url?: string;
        video_url?: string;
      };
    };
  };
  events?: Array<Record<string, unknown>>;
}

interface LineMessagePayload {
  events?: Array<{
    type?: string;
    replyToken?: string;
    timestamp?: number;
    source?: {
      type?: string;
      userId?: string;
      groupId?: string;
      roomId?: string;
    };
    message?: {
      type?: string;
      text?: string;
      contentProvider?: {
        originalContentUrl?: string;
      };
      latitude?: number;
      longitude?: number;
      address?: string;
      fileName?: string;
    };
  }>;
}

// Tipo de mensagem normalizada
export type NormalizedMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'document'
  | 'audio'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'template';

// Remetente normalizado
export interface NormalizedSender {
  id: string;
  name?: string;
  profile_pic?: string;
  platform_id: string; // ID na plataforma externa
}

// Destinatário normalizado
export interface NormalizedRecipient {
  id: string;
  platform_id: string; // ID da página/bot/canal na plataforma
}

// Mensagem normalizada (formato interno)
export interface NormalizedIncomingMessage {
  // Identificação
  provider: SocialChannelProvider;
  message_id: string; // ID único da mensagem na plataforma
  channel_message_id?: string; // ID alternativo da plataforma (pode ser diferente de message_id)
  conversation_id: string; // ID da conversa (psid + page_id, chat_id, etc)

  // Conteúdo
  text: string | null;
  message_type: NormalizedMessageType;
  media_url?: string;
  media_mime_type?: string;
  file_name?: string;

  // Localizacao
  location?: {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
  };

  // Contato (quando compartilham contato)
  contact_info?: {
    name: string;
    phone?: string;
    email?: string;
  };

  // Pessoas
  sender: NormalizedSender;
  recipient: NormalizedRecipient;

  // Metadata
  timestamp: number; // Unix timestamp em ms
  is_forwarded: boolean;
  reply_to_message_id?: string;
  raw_payload: Record<string, unknown>; // Payload original para debug

  // Dados específicos do canal (extensível)
  channel_metadata: Record<string, unknown>;
}

// Mensagem de saída normalizada (para enviar via canal)
export interface NormalizedOutgoingMessage {
  provider: SocialChannelProvider;
  recipient_id: string; // PSID, chat_id, etc
  message_type: NormalizedMessageType;
  text?: string;
  media_url?: string;
  media_mime_type?: string;
  reply_to_message_id?: string;
  metadata?: Record<string, unknown>;
}

// Resultado da normalização
export interface NormalizeResult {
  success: boolean;
  message?: NormalizedIncomingMessage;
  error?: string;
  skip?: boolean; // true para mensagens que devem ser ignoradas (ex: echos, reactions)
}

/**
 * NormalizerService
 *
 * Classe stateless que converte payloads raw de cada plataforma
 * no formato NormalizedIncomingMessage.
 */
export class NormalizerService {
  /**
   * Normaliza um payload raw de qualquer canal suportado
   */
  normalize(provider: SocialChannelProvider, rawPayload: Record<string, unknown>): NormalizeResult {
    switch (provider) {
      case 'facebook':
        return this.normalizeFacebook(rawPayload);
      case 'instagram':
        return this.normalizeInstagram(rawPayload);
      case 'x':
        return this.normalizeX(rawPayload);
      case 'telegram':
        return this.normalizeTelegram(rawPayload);
      case 'tiktok':
        return this.normalizeTikTok(rawPayload);
      case 'line':
        return this.normalizeLine(rawPayload);
      default:
        return {
          success: false,
          error: `Provider "${provider}" not supported for normalization`,
        };
    }
  }

  // ============================================================
  // Facebook Messenger
  // ============================================================
  private normalizeFacebook(raw: Record<string, unknown>): NormalizeResult {
    try {
      // Facebook webhook envia como: { entry: [{ messaging: [...] }] }
      const entry = raw.entry as Array<Record<string, unknown>>;
      if (!entry || entry.length === 0) {
        return { success: false, error: 'No entry in Facebook payload', skip: true };
      }

      const messaging = entry[0]?.messaging as Array<Record<string, unknown>> | undefined;
      if (!messaging || messaging.length === 0) {
        return { success: false, error: 'No messaging in Facebook payload', skip: true };
      }

      const results: NormalizeResult[] = [];
      for (const msg of messaging) {
        const result = this.normalizeFacebookMessage(msg);
        results.push(result);
      }

      // Retorna o primeiro válido
      const valid = results.find(r => r.success && !r.skip);
      return valid || results[0] || { success: false, error: 'No valid Facebook messages', skip: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private normalizeFacebookMessage(msg: Record<string, unknown>): NormalizeResult {
    const payload = msg as FacebookMessagingPayload;

    // Ignorar echo (mensagens enviadas pela própria página)
    if (payload.is_echo === true) {
      return { success: true, skip: true };
    }

    const senderId = payload.sender?.id;
    const recipientId = payload.recipient?.id;

    if (!senderId || !recipientId) {
      return { success: false, error: 'Missing sender or recipient', skip: true };
    }

    const messageId = payload.message?.mid;
    if (!messageId) {
      return { success: false, error: 'Missing message ID', skip: true };
    }

    const timestamp = payload.timestamp || Date.now();
    const conversationId = `fb_${senderId}_${recipientId}`;

    // Verificar se é reply a outra mensagem
    const replyToMid = payload.message?.reply_to?.mid;

    // Texto
    const text = payload.message?.text || null;

    // Attachments
    const attachments = payload.message?.attachments;
    const { messageType, mediaUrl, mediaMimeType, fileName, location, contactInfo } =
      this.parseAttachments(attachments, 'facebook');

    // Se não tem texto nem attachments, ignorar
    if (!text && !attachments && messageType === 'text') {
      return { success: true, skip: true };
    }

    return {
      success: true,
      message: {
        provider: 'facebook',
        message_id: messageId,
        conversation_id: conversationId,
        text: text || (contactInfo ? `Contato: ${contactInfo.name}` : null),
        message_type: messageType,
        media_url: mediaUrl,
        media_mime_type: mediaMimeType,
        file_name: fileName,
        location,
        contact_info: contactInfo,
        sender: {
          id: senderId,
          platform_id: senderId,
        },
        recipient: {
          id: recipientId,
          platform_id: recipientId,
        },
        timestamp: timestamp * 1000, // Facebook envia em segundos
        is_forwarded: false,
        reply_to_message_id: replyToMid,
        raw_payload: msg,
        channel_metadata: {
          is_echo: msg.is_echo,
        },
      },
    };
  }

  // ============================================================
  // Instagram Direct
  // ============================================================
  private normalizeInstagram(raw: Record<string, unknown>): NormalizeResult {
    try {
      // Instagram usa Graph API: { entry: [{ messaging: [...] }] }
      const entry = raw.entry as Array<Record<string, unknown>>;
      if (!entry || entry.length === 0) {
        return { success: false, error: 'No entry in Instagram payload', skip: true };
      }

      const messaging = entry[0]?.messaging as InstagramMessagingPayload[] | undefined;
      if (!messaging || messaging.length === 0) {
        return { success: false, error: 'No messaging in Instagram payload', skip: true };
      }

      const msg = messaging[0];

      // Ignorar echo
      if (msg.is_echo === true) {
        return { success: true, skip: true };
      }

      const senderId = msg.sender?.id;
      const recipientId = msg.recipient?.id;

      if (!senderId || !recipientId) {
        return { success: false, error: 'Missing sender or recipient', skip: true };
      }

      const messageId = msg.message?.mid;
      if (!messageId) {
        return { success: false, error: 'Missing message ID', skip: true };
      }

      const timestamp = msg.timestamp || Date.now();
      const conversationId = `ig_${senderId}_${recipientId}`;
      const text = msg.message?.text || null;

      const attachments = msg.message?.attachments;
      const { messageType, mediaUrl, mediaMimeType, fileName, location, contactInfo } =
        this.parseAttachments(attachments, 'instagram');

      return {
        success: true,
        message: {
          provider: 'instagram',
          message_id: messageId,
          conversation_id: conversationId,
          text: text || (contactInfo ? `Contato: ${contactInfo.name}` : null),
          message_type: messageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          file_name: fileName,
          location,
          contact_info: contactInfo,
          sender: {
            id: senderId,
            platform_id: senderId,
          },
          recipient: {
            id: recipientId,
            platform_id: recipientId,
          },
          timestamp: timestamp * 1000,
          is_forwarded: false,
          raw_payload: msg as unknown as Record<string, unknown>,
          channel_metadata: {
            is_echo: msg.is_echo,
          },
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ============================================================
  // X (Twitter) DMs
  // ============================================================
  private normalizeX(raw: Record<string, unknown>): NormalizeResult {
    try {
      // X Account Activity API: { direct_message_events: [{ ... }] }
      const events = raw.direct_message_events as XDirectMessagePayload[] | undefined;
      if (!events || events.length === 0) {
        return { success: false, error: 'No DM events in X payload', skip: true };
      }

      const event = events[0];
      const type = event.type;

      // Ignorar message_create events (são nossos próprios envios)
      if (type === 'message_create') {
        const senderId = event.message_create?.sender_id;
        // Se não tiver target, é nosso próprio echo
        if (!event.message_create?.target) {
          return { success: true, skip: true };
        }
      }

      const messageData = event.message_create;
      if (!messageData) {
        return { success: false, error: 'Missing message_create', skip: true };
      }

      const senderId = messageData.sender_id;
      const target = messageData.target;
      const recipientId = target?.recipient_id;

      if (!senderId || !recipientId) {
        return { success: false, error: 'Missing sender or recipient in X DM', skip: true };
      }

      const messageId = event.id;
      if (!messageId) {
        return { success: false, error: 'Missing event ID', skip: true };
      }

      const timestamp = event.created_timestamp || Date.now();
      const conversationId = `x_${senderId}_${recipientId}`;

      const messageData2 = messageData.message_data;
      const text = messageData2?.text || null;

      const attachments = messageData2?.attachment;
      let messageType: NormalizedMessageType = 'text';
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;

      if (attachments?.media) {
        const mediaObj = attachments.media as Record<string, unknown>;
        const mediaUrlRaw = (mediaObj.media_url_https || mediaObj.url_expanded_pic) as string | undefined;
        mediaUrl = mediaUrlRaw;
        mediaMimeType = mediaObj.ext_media_type as string | undefined;
        messageType = this.mediaToMessageType(mediaMimeType);
      }

      return {
        success: true,
        message: {
          provider: 'x',
          message_id: messageId,
          conversation_id: conversationId,
          text,
          message_type: messageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          sender: {
            id: senderId,
            platform_id: senderId,
          },
          recipient: {
            id: recipientId,
            platform_id: recipientId,
          },
          timestamp: typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp * 1000,
          is_forwarded: false,
          raw_payload: raw,
          channel_metadata: {
            event_type: type,
          },
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ============================================================
  // Telegram
  // ============================================================
  private normalizeTelegram(raw: Record<string, unknown>): NormalizeResult {
    try {
      // Telegram webhook (getUpdates): { result: [{ message: {...} }] }
      // OU via webhook direto: { message: {...} }

      let message = raw.message as Record<string, unknown> | undefined;

      // Se tem "result", é resposta de getUpdates
      if (!message && raw.result) {
        const results = raw.result as Array<Record<string, unknown>>;
        if (!results || results.length === 0) {
          return { success: false, error: 'No result in Telegram payload', skip: true };
        }
        message = results[results.length - 1]?.message as Record<string, unknown> | undefined;
      }

      if (!message) {
        return { success: false, error: 'No message in Telegram payload', skip: true };
      }

      // Ignorar mensagens de edit (edited_message)
      // Ignorar channel posts
      if (message.channel_post) {
        return { success: true, skip: true };
      }

      const chat = message.chat as Record<string, unknown> | undefined;
      const sender = message.from as Record<string, unknown> | undefined;
      const chatId = chat?.id as number | undefined;
      const senderId = sender?.id as number | undefined;

      if (!chatId || !senderId) {
        return { success: false, error: 'Missing chat or sender', skip: true };
      }

      const messageId = message.message_id as number | undefined;
      if (!messageId) {
        return { success: false, error: 'Missing message ID', skip: true };
      }

      const timestamp = (message.date as number) || Date.now();
      const conversationId = `tg_${chatId}`;
      const botUsername = chat?.username as string | undefined;
      const recipientId = botUsername || String(chatId);

      // Texto
      const text = message.text as string | undefined;

      // Tipo de mensagem
      let messageType: NormalizedMessageType = 'text';
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;
      let fileName: string | undefined;
      let caption = message.caption as string | undefined;

      const finalText = text || caption || null;

      if (message.photo) {
        const photos = message.photo as Array<Record<string, unknown>>;
        const largest = photos[photos.length - 1];
        const fileId = largest?.file_id as string;
        mediaUrl = fileId;
        mediaMimeType = 'image/jpeg';
        messageType = 'image';
      } else if (message.video) {
        const video = message.video as Record<string, unknown>;
        mediaUrl = video.file_id as string;
        mediaMimeType = (video.mime_type as string) || 'video/mp4';
        messageType = 'video';
        fileName = video.file_name as string | undefined;
      } else if (message.document) {
        const doc = message.document as Record<string, unknown>;
        mediaUrl = doc.file_id as string;
        mediaMimeType = doc.mime_type as string | undefined;
        messageType = 'document';
        fileName = doc.file_name as string | undefined;
      } else if (message.voice) {
        const voice = message.voice as Record<string, unknown>;
        mediaUrl = voice.file_id as string;
        mediaMimeType = 'audio/ogg';
        messageType = 'audio';
      } else if (message.audio) {
        const audio = message.audio as Record<string, unknown>;
        mediaUrl = audio.file_id as string;
        mediaMimeType = audio.mime_type as string | undefined;
        messageType = 'audio';
        fileName = audio.file_name as string | undefined;
      } else if (message.sticker) {
        const sticker = message.sticker as Record<string, unknown>;
        mediaUrl = sticker.file_id as string;
        mediaMimeType = 'image/webp';
        messageType = 'sticker';
      } else if (message.location) {
        const loc = message.location as Record<string, unknown>;
        messageType = 'location';
        mediaUrl = undefined;
        return {
          success: true,
          message: {
            provider: 'telegram',
            message_id: String(messageId),
            conversation_id: conversationId,
            text: finalText,
            message_type: 'location',
            location: {
              lat: (loc.latitude as number) || 0,
              lng: (loc.longitude as number) || 0,
            },
            sender: {
              id: String(senderId),
              name: this.getTelegramSenderName(sender),
              platform_id: String(senderId),
            },
            recipient: {
              id: recipientId,
              platform_id: recipientId,
            },
            timestamp: timestamp * 1000,
            is_forwarded: message.forward_date !== undefined,
            reply_to_message_id: message.reply_to_message
              ? String((message.reply_to_message as Record<string, unknown>).message_id)
              : undefined,
            raw_payload: raw,
            channel_metadata: {
              chat_type: chat?.type,
              chat_title: chat?.title,
            },
          },
        };
      } else if (message.contact) {
        const contact = message.contact as Record<string, unknown>;
        messageType = 'contact';
        return {
          success: true,
          message: {
            provider: 'telegram',
            message_id: String(messageId),
            conversation_id: conversationId,
            text: finalText,
            message_type: 'contact',
            contact_info: {
              name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
              phone: contact.phone_number as string | undefined,
            },
            sender: {
              id: String(senderId),
              name: this.getTelegramSenderName(sender),
              platform_id: String(senderId),
            },
            recipient: {
              id: recipientId,
              platform_id: recipientId,
            },
            timestamp: timestamp * 1000,
            is_forwarded: message.forward_date !== undefined,
            raw_payload: raw,
            channel_metadata: {
              chat_type: chat?.type,
            },
          },
        };
      }

      return {
        success: true,
        message: {
          provider: 'telegram',
          message_id: String(messageId),
          conversation_id: conversationId,
          text: finalText,
          message_type: messageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          file_name: fileName,
          sender: {
            id: String(senderId),
            name: this.getTelegramSenderName(sender),
            platform_id: String(senderId),
          },
          recipient: {
            id: recipientId,
            platform_id: recipientId,
          },
          timestamp: timestamp * 1000,
          is_forwarded: message.forward_date !== undefined,
          reply_to_message_id: message.reply_to_message
            ? String((message.reply_to_message as Record<string, unknown>).message_id)
            : undefined,
          raw_payload: raw,
          channel_metadata: {
            chat_type: chat?.type,
            chat_title: chat?.title,
            bot_username: botUsername,
          },
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private getTelegramSenderName(sender: Record<string, unknown> | undefined): string {
    if (!sender) return 'Desconhecido';
    const first = sender.first_name as string | undefined;
    const last = sender.last_name as string | undefined;
    const username = sender.username as string | undefined;
    return `${first || ''} ${last || ''}`.trim() || username || 'Desconhecido';
  }

  // ============================================================
  // TikTok Messaging
  // ============================================================
  private normalizeTikTok(raw: Record<string, unknown>): NormalizeResult {
    try {
      // TikTok webhook: { events: [{ type: 'message', event: {...} }] }
      const events = raw.events as TikTokEventPayload[] | undefined;
      if (!events || events.length === 0) {
        return { success: false, error: 'No events in TikTok payload', skip: true };
      }

      const event = events[0];
      const eventType = event.event;
      if (!eventType) {
        return { success: false, error: 'Missing event data', skip: true };
      }

      const senderId = event.sender?.open_id;
      const recipientId = event.recipient?.open_id;

      if (!senderId) {
        return { success: false, error: 'Missing sender open_id', skip: true };
      }

      const messageId = event.event_id;
      if (!messageId) {
        return { success: false, error: 'Missing event_id', skip: true };
      }

      const timestamp = event.create_time || Date.now();
      const conversationId = `tt_${senderId}_${recipientId || 'bot'}`;

      // Mensagem de texto
      const message = eventType.message;
      const text = message?.text;
      const msgType = (message?.message_type) || 'text';

      // Attachments
      const attachments = message?.attachment as Record<string, unknown> | undefined;
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;
      let finalMessageType: NormalizedMessageType = 'text';

      if (attachments) {
        const attType = attachments.type as string | undefined;
        if (attType === 'image' || attType === 'video') {
          mediaUrl = (attachments.image_url || attachments.video_url) as string | undefined;
          mediaMimeType = attType === 'image' ? 'image/jpeg' : 'video/mp4';
          finalMessageType = attType as NormalizedMessageType;
        }
      }

      return {
        success: true,
        message: {
          provider: 'tiktok',
          message_id: messageId,
          conversation_id: conversationId,
          text: text || null,
          message_type: finalMessageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          sender: {
            id: senderId,
            platform_id: senderId,
          },
          recipient: {
            id: recipientId || 'bot',
            platform_id: recipientId || 'bot',
          },
          timestamp: typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp * 1000,
          is_forwarded: false,
          raw_payload: raw,
          channel_metadata: {
            event_type: event.type,
          },
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ============================================================
  // Line Messaging
  // ============================================================
  private normalizeLine(raw: Record<string, unknown>): NormalizeResult {
    try {
      // Line webhook: { events: [{ type: 'message', source: {...}, message: {...} }] }
      const payload = raw as LineMessagePayload;
      const events = payload.events;
      if (!events || events.length === 0) {
        return { success: false, error: 'No events in Line payload', skip: true };
      }

      const event = events[0];
      const eventType = event.type;

      // Ignorar follow, join, leave, etc
      if (eventType !== 'message') {
        return { success: true, skip: true };
      }

      const source = event.source;
      const message = event.message;

      if (!source || !message) {
        return { success: false, error: 'Missing source or message', skip: true };
      }

      const senderId = source.userId;
      const groupId = source.groupId;
      const roomId = source.roomId;

      if (!senderId) {
        return { success: false, error: 'Missing userId', skip: true };
      }

      const messageId = event.replyToken || `line_${Date.now()}`;
      const conversationId = `line_${senderId}_${groupId || roomId || 'direct'}`;
      const timestamp = event.timestamp || Date.now();

      // Texto
      const text = message.text;

      // Tipo
      const lineMsgType = message.type;
      let messageType: NormalizedMessageType = 'text';
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;
      let fileName: string | undefined;

      switch (lineMsgType) {
        case 'image':
          messageType = 'image';
          mediaMimeType = 'image/jpeg';
          mediaUrl = message.contentProvider?.originalContentUrl;
          break;
        case 'video':
          messageType = 'video';
          mediaMimeType = 'video/mp4';
          mediaUrl = message.contentProvider?.originalContentUrl;
          break;
        case 'audio':
          messageType = 'audio';
          mediaMimeType = 'audio/m4a';
          break;
        case 'file':
          messageType = 'document';
          mediaMimeType = message.fileName?.includes('.')
            ? this.mimeFromExtension(message.fileName)
            : undefined;
          fileName = message.fileName;
          break;
        case 'sticker':
          messageType = 'sticker';
          break;
        case 'location':
          messageType = 'location';
          break;
      }

      const location = lineMsgType === 'location'
        ? {
            lat: (message.latitude as number) || 0,
            lng: (message.longitude as number) || 0,
            name: message.address,
            address: message.address,
          }
        : undefined;

      return {
        success: true,
        message: {
          provider: 'line',
          message_id: messageId || `line_${Date.now()}`,
          conversation_id: conversationId,
          text: text || null,
          message_type: messageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          file_name: fileName,
          location,
          sender: {
            id: senderId,
            platform_id: senderId,
          },
          recipient: {
            id: groupId || roomId || 'direct',
            platform_id: groupId || roomId || 'direct',
          },
          timestamp: typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp * 1000,
          is_forwarded: false,
          raw_payload: raw,
          channel_metadata: {
            event_type: eventType,
            line_message_type: lineMsgType,
            source_type: source.type,
          },
        },
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ============================================================
  // Helpers
  // ============================================================
  private parseAttachments(
    attachments: Array<Record<string, unknown>> | undefined,
    _provider: string,
  ): {
    messageType: NormalizedMessageType;
    mediaUrl?: string;
    mediaMimeType?: string;
    fileName?: string;
    location?: { lat: number; lng: number; name?: string; address?: string };
    contactInfo?: { name: string; phone?: string; email?: string };
  } {
    if (!attachments || attachments.length === 0) {
      return { messageType: 'text' };
    }

    const first = attachments[0];
    const type = first.type as string | undefined;
    const payload = first.payload as Record<string, unknown> | undefined;
    const url = first.url as string | undefined;

    switch (type) {
      case 'image':
        return {
          messageType: 'image',
          mediaUrl: url || (payload?.url as string | undefined),
          mediaMimeType: 'image/jpeg',
        };
      case 'video':
        return {
          messageType: 'video',
          mediaUrl: url || (payload?.url as string | undefined),
          mediaMimeType: 'video/mp4',
        };
      case 'audio':
      case 'voice':
      case 'file_audio':
        return {
          messageType: 'audio',
          mediaUrl: url || (payload?.url as string | undefined),
          mediaMimeType: 'audio/ogg',
        };
      case 'file':
      case 'document':
        return {
          messageType: 'document',
          mediaUrl: url || (payload?.url as string | undefined),
          mediaMimeType: payload?.mime_type as string | undefined,
          fileName: (payload?.name || payload?.filename) as string | undefined,
        };
      case 'location': {
        const coords = payload?.coordinates as Record<string, unknown> | undefined;
        return {
          messageType: 'location',
          location: {
            lat: (coords?.lat as number) || 0,
            lng: (coords?.long as number) || 0,
            name: payload?.title as string | undefined,
            address: payload?.address as string | undefined,
          },
        };
      }
      case 'user':
        return {
          messageType: 'contact',
          contactInfo: {
            name: (payload?.name as string) || 'Contato',
            phone: payload?.phone as string | undefined,
          },
        };
      case 'sticker':
        return {
          messageType: 'sticker',
          mediaUrl: url,
        };
      default:
        return {
          messageType: url ? 'document' : 'text',
          mediaUrl: url,
        };
    }
  }

  private mediaToMessageType(mimeType: string | undefined): NormalizedMessageType {
    if (!mimeType) return 'text';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'document';
    return 'document';
  }

  private mimeFromExtension(fileName: string): string | undefined {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
      zip: 'application/zip',
    };
    return ext ? mimeMap[ext] : undefined;
  }

  /**
   * Gera conversation_id único para um canal
   */
  static generateConversationId(
    provider: SocialChannelProvider,
    senderId: string,
    recipientId: string,
  ): string {
    return `${provider === 'x' ? 'x' : provider.substring(0, 2)}_${senderId}_${recipientId}`;
  }

  /**
   * Mapeia provider string para ChannelProvider type
   */
  static toChannelProvider(provider: SocialChannelProvider): ChannelProvider {
    return provider as ChannelProvider;
  }
}

// Singleton export
export const normalizer = new NormalizerService();
