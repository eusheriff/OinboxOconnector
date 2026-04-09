// Re-export shared types
export type {
  User,
  Tenant,
  ClientProfile,
  Client,
  ClientDocument,
  Lead,
  Property,
  Message,
  Conversation,
  Appointment,
  Deal,
  Campaign,
  OutreachCampaign,
  AIConfig,
  ApiResponse,
  PaginatedResponse,
  MarketingTemplate,
  QualificationRule,
  PortalConfig,
  PortalInfo,
  PropertyPublication,
  BulkPublishRequest,
  BulkPublishResult,
  PortalPublishResponse,
} from '@shared/types';

export { Platform, DealStage, PublicationStatus } from '@shared/types';

export type { AIProvider, PortalAuthType } from '@shared/types';

// Re-export UI types
export type { ExtendedUser, ToastNotification } from './ui';

export { AppView } from './ui';
