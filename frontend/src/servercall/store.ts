import { ServerCallVerbs, ServerCallsType } from "servercall";

export type ServerCallsKeyType =
    | "get"
    | "getHealth"
    | "get"
    | "post"
    | "delete"
    | "getSearch"
    | "getSingle"
    | "postSingle"
    | "postUpdateById"
    | "postUpdate"
    | "getGetTokenOwner"
    | "postSetKeyValues"
    | "getGetKeyValues"
    | "postFunction"
    | "getAuthGoogle"
    | "getAuthGoogleCallback"
    | "getAuthGithub"
    | "getAuthGithubCallback"
    | "getAuthConnectionToken"
    | "getAuthRefreshConnectionToken"
    | "getAuthAuthCheck"
    | "postAuthRegister"
    | "postAuthLogin"
    | "postAuthVerifyOtp"
    | "postAuthResendOtp"
    | "getAuthGoogle"
    | "getAuthGoogleCallback"
    | "getGatewayLogs"
    | "getGatewayLoggedUserDetails"
    | "postGatewayRecordSpace"
    | "getGatewayRecordSpace"
    | "postGatewayUpload"
    | "getGatewayUploadFiles"
    | "postGatewayLoadFile"
    | "getGatewayGoogleAuth"
    | "postGatewayGoogleAuth"
    | "postGatewayNotifyMail"
    | "postGatewayNotifySms"
    | "postGatewayNotifyWhatsapp"
    | "postGatewayNotifyWhatsappReply"
    | "getGatewayNotifyWhatsappCallback"
    | "getGatewayPaystackBankList"
    | "postGatewayPaystackTransfer"
    | "postGatewayPaystackTransferFinalize"
    | "postGatewayPaystackTransactionInitiate"
    | "postGatewayPaystackTransactionVerify"
    | "getGatewayPaystackTransactionStatus"
    | "postGatewayWalletUpdateBalance"
    | "getGatewayViews"
    | "postGatewayViews"
    | "getGatewayViews"
    | "postGatewayViews"
    | "getGatewayBlogs"
    | "postGatewayBlogs"
    | "getGatewayBlogsAll"
    | "getGatewayBlogs"
    | "getGatewayOrganizations"
    | "postGatewayOrganizations"
    | "deleteGatewayOrganizations"
    | "getGatewayOrganizationsSub"
    | "postGatewayOrganizationsSub"
    | "postGatewayOrganizationsAddMember"
    | "getGatewayOrganizations"
    | "getGatewayProjects"
    | "getGatewayRecordsByRecordspaceId"
    | "getGatewaySharedProjects"
    | "getGatewaySharedProjectTokens"
    | "getGatewayBulkProjectResources"
    | "postGatewayProjectsAddUser"
    | "postGatewayModelChatsSaveChatItem"
    | "getGatewayModelChatsSavedChatItems"
    | "deleteGatewayModelChatsSavedChatItem"
    | "deleteGatewayModelChatsSavedChatItemById"

    | "getGatewayModelChatsSavedFullSessions"
    | "deleteGatewayModelChatsSavedFullSession"
    | "postGatewayModelChatsAddOrUpdateHistory"
    | "getGatewayModelChatsChatHistory"
    | "deleteGatewayModelChatsChatHistorySession"
    | "deleteGatewayModelChatsChatHistorySessionById"
    | "getGatewayModelChatsPinnedChats"
    | "postGatewayModelChatsPinChatSession"
    | "deleteGatewayModelChatsUnpinChatSession"
    | "postGatewayModelChatsToggleStarred"
    | "postGatewayModelChatsMigrateFromLocalStorage"
    | "getGatewayModelChatsStats"
    | "getGatewayModelChatsResources"
    | "getGatewayModelChatsConversationById"
    | "getGatewayModelChatsConversationOrphans"
    | "getGatewayModelChatsConversationMessageOrphans"
    | "getGatewayModelChatsAgentRunById"
    | "postGatewayModelChatsUpsertPersonality"
    | "getGatewayModelChatsListPersonalities"
    | "deleteGatewayModelChatsDeletePersonality"
    | "postGatewayModelChatsSetConversationPersonality"
    | "postGatewayProjectsRemoveUser"
    | "getGatewayProjectsUsers"
    | "postGatewayProject"
    | "postSetInferredStructure"
    | "postGetInferredStructure"
    | "postSetStructure"
    | "postUtilsGetEmbedding"
    | "postGatewayModelChatsPublishConversation"
    | "postGatewayModelChatsUnpublishConversation"
    | "getGatewayModelChatsPublishedConversations"
    | "getAllGatewayModelChatsPublishedConversations"
    | "getGatewayModelChatsPublishedConversation"
    | "deleteGatewayModelChatsPublishedConversation"
    | "getGatewayIntegrationsGmailConnect"
    | "getGatewayIntegrationsGmailStatus"
    | "deleteGatewayIntegrationsGmail"
    | "getGatewayIntegrationsLinkedinConnect"
    | "getGatewayIntegrationsLinkedinStatus"
    | "deleteGatewayIntegrationsLinkedin"
    | "getGatewayModelChatsModels"
    | "postGatewayAdminGrantCredits"
    | "getGatewayAdminStatus"
    | "getGatewayAdminCreditsHistory"
    | "getGatewayAdminUsersSearch"
    | "postGatewayAudioTranscribe"
    | "postGatewayAudioSynthesize";


export const serverCalls: ServerCallsType<ServerCallsKeyType> = {
    get: {
        path: (args: { recordSpaceSlug: string; projectSlug: string }) =>
            `/${args.projectSlug}/${args.recordSpaceSlug}`,
        name: "get",
        verb: ServerCallVerbs.Get,
    },
    getHealth: {
        path: "/health",
        name: "getHealth",
        verb: ServerCallVerbs.Get,
    },
    post: {
        path: "/{projectSlug}/{recordSpaceSlug}",
        name: "post",
        verb: ServerCallVerbs.Post,
    },
    delete: {
        path: (args: { recordSpaceSlug: string; projectSlug: string }) =>
            `/${args.projectSlug}/${args.recordSpaceSlug}`,
        name: "delete",
        verb: ServerCallVerbs.Delete,
    },
    getSearch: {
        path: (args: { recordSpaceSlug: string; projectSlug: string }) =>
            `/${args.projectSlug}/${args.recordSpaceSlug}/search`,
        name: "getSearch",
        verb: ServerCallVerbs.Get,
    },
    getSingle: {
        path: "/{projectSlug}/{recordSpaceSlug}/_single_",
        name: "getSingle",
        verb: ServerCallVerbs.Get,
    },
    postSingle: {
        path: "/{projectSlug}/{recordSpaceSlug}/_single_",
        name: "postSingle",
        verb: ServerCallVerbs.Post,
    },
    postUpdateById: {
        path: "/{projectSlug}/{recordSpaceSlug}/update-by-id",
        name: "postUpdateById",
        verb: ServerCallVerbs.Post,
    },
    postUpdate: {
        path: "/{projectSlug}/{recordSpaceSlug}/update",
        name: "postUpdate",
        verb: ServerCallVerbs.Post,
    },
    getGetTokenOwner: {
        path: "/{projectSlug}/{recordSpaceSlug}/get-token-owner",
        name: "getGetTokenOwner",
        verb: ServerCallVerbs.Get,
    },
    postSetKeyValues: {
        path: "/{projectSlug}/{recordSpaceSlug}/set-key-values",
        name: "postSetKeyValues",
        verb: ServerCallVerbs.Post,
    },
    getGetKeyValues: {
        path: "/{projectSlug}/{recordSpaceSlug}/get-key-values",
        name: "getGetKeyValues",
        verb: ServerCallVerbs.Get,
    },
    postFunction: {
        path: "/{projectSlug}/function/{functionName}",
        name: "postFunction",
        verb: ServerCallVerbs.Post,
    },
    getAuthGoogle: {
        path: (args: { recordSpaceSlug: string; projectId: string }) =>
            `/${args.projectId}/${args.recordSpaceSlug}/auth/google`,
        name: "getAuthGoogle",
        verb: ServerCallVerbs.Get,
    },
    getAuthGoogleCallback: {
        path: (args: { recordSpaceSlug: string; projectId: string }) =>
            `/${args.projectId}/${args.recordSpaceSlug}/auth/google/callback`,
        name: "getAuthGoogleCallback",
        verb: ServerCallVerbs.Get,
    },
    getAuthGithub: {
        path: "/auth/_/github",
        name: "getAuthGithub",
        verb: ServerCallVerbs.Get,
    },
    getAuthGithubCallback: {
        path: "/auth/_/github/callback",
        name: "getAuthGithubCallback",
        verb: ServerCallVerbs.Get,
    },
    getAuthConnectionToken: {
        path: "/auth/_/connection_token",
        name: "getAuthConnectionToken",
        verb: ServerCallVerbs.Get,
    },
    getAuthRefreshConnectionToken: {
        path: "/auth/_/refresh_connection_token",
        name: "getAuthRefreshConnectionToken",
        verb: ServerCallVerbs.Get,
    },
    getAuthAuthCheck: {
        path: (args: { token: string }) => `/auth/_/auth_check/${args.token}`,
        name: "getAuthAuthCheck",
        verb: ServerCallVerbs.Get,
    },
    postAuthRegister: {
        path: "/auth/_/register",
        name: "postAuthRegister",
        verb: ServerCallVerbs.Post,
    },
    postAuthLogin: {
        path: "/auth/_/login",
        name: "postAuthLogin",
        verb: ServerCallVerbs.Post,
    },
    postAuthVerifyOtp: {
        path: "/auth/_/verify-otp",
        name: "postAuthVerifyOtp",
        verb: ServerCallVerbs.Post,
    },
    postAuthResendOtp: {
        path: "/auth/_/resend-otp",
        name: "postAuthResendOtp",
        verb: ServerCallVerbs.Post,
    },
    getGatewayLogs: {
        path: "/gateway/*/logs",
        name: "getGatewayLogs",
        verb: ServerCallVerbs.Get,
    },
    getGatewayLoggedUserDetails: {
        path: "/gateway/*/logged-user-details",
        name: "getGatewayLoggedUserDetails",
        verb: ServerCallVerbs.Get,
    },
    postGatewayRecordSpace: {
        path: (args: { projectId: string }) =>
            `/gateway/*/record-space/${args.projectId}`,
        name: "postGatewayRecordSpace",
        verb: ServerCallVerbs.Post,
    },
    getGatewayRecordSpace: {
        path: (args: { projectId: string; recordSpaceSlug: string }) =>
            `/gateway/*/record-space/${args.projectId}/${args.recordSpaceSlug}`,
        name: "getGatewayRecordSpace",
        verb: ServerCallVerbs.Get,
    },
    postGatewayUpload: {
        path: "/gateway/*/upload",
        name: "postGatewayUpload",
        verb: ServerCallVerbs.Post,
    },
    getGatewayUploadFiles: {
        path: "/gateway/*/upload/files",
        name: "getGatewayUploadFiles",
        verb: ServerCallVerbs.Get,
    },
    postGatewayLoadFile: {
        path: (args: { projectId: string }) =>
            `/gateway/*/${args.projectId}/load/file`,
        name: "postGatewayLoadFile",
        verb: ServerCallVerbs.Post,
    },
    getGatewayGoogleAuth: {
        path: (args: { projectSlug: string }) =>
            `/gateway/*/${args.projectSlug}/google/auth`,
        name: "getGatewayGoogleAuth",
        verb: ServerCallVerbs.Get,
    },
    postGatewayGoogleAuth: {
        path: (args: { projectSlug: string }) =>
            `/gateway/*/${args.projectSlug}/google/auth`,
        name: "postGatewayGoogleAuth",
        verb: ServerCallVerbs.Post,
    },
    postGatewayNotifyMail: {
        path: "/gateway/*/notify/mail",
        name: "postGatewayNotifyMail",
        verb: ServerCallVerbs.Post,
    },
    postGatewayNotifySms: {
        path: "/gateway/*/notify/sms",
        name: "postGatewayNotifySms",
        verb: ServerCallVerbs.Post,
    },
    postGatewayNotifyWhatsapp: {
        path: "/gateway/*/notify/whatsapp",
        name: "postGatewayNotifyWhatsapp",
        verb: ServerCallVerbs.Post,
    },
    postGatewayNotifyWhatsappReply: {
        path: "/gateway/*/notify/whatsapp/reply",
        name: "postGatewayNotifyWhatsappReply",
        verb: ServerCallVerbs.Post,
    },
    getGatewayNotifyWhatsappCallback: {
        path: "/gateway/*/notify/whatsapp/callback",
        name: "getGatewayNotifyWhatsappCallback",
        verb: ServerCallVerbs.Get,
    },
    getGatewayPaystackBankList: {
        path: "/gateway/*/paystack/bank_list",
        name: "getGatewayPaystackBankList",
        verb: ServerCallVerbs.Get,
    },
    postGatewayPaystackTransfer: {
        path: "/gateway/*/paystack/transfer",
        name: "postGatewayPaystackTransfer",
        verb: ServerCallVerbs.Post,
    },
    postGatewayPaystackTransferFinalize: {
        path: "/gateway/*/paystack/transfer/finalize",
        name: "postGatewayPaystackTransferFinalize",
        verb: ServerCallVerbs.Post,
    },
    postGatewayPaystackTransactionInitiate: {
        path: "/gateway/*/paystack/transaction/initiate",
        name: "postGatewayPaystackTransactionInitiate",
        verb: ServerCallVerbs.Post,
    },
    postGatewayPaystackTransactionVerify: {
        path: (args: { reference: string }) => `/gateway/*/paystack/transaction/${args.reference}/verify`,
        name: "postGatewayPaystackTransactionVerify",
        verb: ServerCallVerbs.Post,
    },
    getGatewayPaystackTransactionStatus: {
        path: (args: { reference: string }) => `/gateway/*/paystack/transaction/${args.reference}`,
        name: "getGatewayPaystackTransactionStatus",
        verb: ServerCallVerbs.Get,
    },
    postGatewayWalletUpdateBalance: {
        path: "/gateway/*/wallet/update_balance",
        name: "postGatewayWalletUpdateBalance",
        verb: ServerCallVerbs.Post,
    },
    getGatewayViews: {
        path: (args: { id: string }) => `/gateway/*/views/${args.id}`,
        name: "getGatewayViews",
        verb: ServerCallVerbs.Get,
    },
    postGatewayViews: {
        path: (args: { id: string }) => `/gateway/*/views/${args.id}`,
        name: "postGatewayViews",
        verb: ServerCallVerbs.Post,
    },
    getGatewayBlogs: {
        path: (args: { id: string }) => `/gateway/*/blogs/${args.id}`,
        name: "getGatewayBlogs",
        verb: ServerCallVerbs.Get,
    },
    postGatewayBlogs: {
        path: "/gateway/*/blogs",
        name: "postGatewayBlogs",
        verb: ServerCallVerbs.Post,
    },
    getGatewayBlogsAll: {
        path: "/gateway/*/blogs/all",
        name: "getGatewayBlogsAll",
        verb: ServerCallVerbs.Get,
    },
    getGatewayOrganizations: {
        path: "/gateway/*/organizations/{id}",
        name: "getGatewayOrganizations",
        verb: ServerCallVerbs.Get,
    },
    postGatewayOrganizations: {
        path: "/gateway/*/organizations",
        name: "postGatewayOrganizations",
        verb: ServerCallVerbs.Post,
    },
    deleteGatewayOrganizations: {
        path: "/gateway/*/organizations",
        name: "deleteGatewayOrganizations",
        verb: ServerCallVerbs.Delete,
    },
    getGatewayOrganizationsSub: {
        path: "/gateway/*/organizations/sub",
        name: "getGatewayOrganizationsSub",
        verb: ServerCallVerbs.Get,
    },
    postGatewayOrganizationsSub: {
        path: "/gateway/*/organizations/sub",
        name: "postGatewayOrganizationsSub",
        verb: ServerCallVerbs.Post,
    },
    postGatewayOrganizationsAddMember: {
        path: (args: { id: string }) =>
            `/gateway/*/organizations/${args.id}/add-member`,
        name: "postGatewayOrganizationsAddMember",
        verb: ServerCallVerbs.Post,
    },
    getGatewayProjects: {
        path: "/gateway/*/projects",
        name: "getGatewayProjects",
        verb: ServerCallVerbs.Get,
    },
    getGatewayRecordsByRecordspaceId: {
        path: "/gateway/*/records-by-recordspace_id",
        name: "getGatewayRecordsByRecordspaceId",
        verb: ServerCallVerbs.Get,
    },
    getGatewaySharedProjects: {
        path: "/gateway/*/shared-projects",
        name: "getGatewaySharedProjects",
        verb: ServerCallVerbs.Get,
    },
    getGatewaySharedProjectTokens: {
        path: "/gateway/*/shared-project-tokens",
        name: "getGatewaySharedProjectTokens",
        verb: ServerCallVerbs.Get,
    },
    getGatewayBulkProjectResources: {
        path: "/gateway/*/bulk-project-resources",
        name: "getGatewayBulkProjectResources",
        verb: ServerCallVerbs.Get,
    },
    postGatewayModelChatsSaveChatItem: {
        path: "/gateway/*/model-chats/save-chat-item",
        name: "postGatewayModelChatsSaveChatItem",
        verb: ServerCallVerbs.Post,
    },
    getGatewayModelChatsSavedChatItems: {
        path: "/gateway/*/model-chats/saved-chat-items",
        name: "getGatewayModelChatsSavedChatItems",
        verb: ServerCallVerbs.Get,
    },
    deleteGatewayModelChatsSavedChatItem: {
        path: (args: { id: string }) => `/gateway/*/model-chats/saved-chat-item?id=${args.id}`,
        name: "deleteGatewayModelChatsSavedChatItem",
        verb: ServerCallVerbs.Delete,
    },
    deleteGatewayModelChatsSavedChatItemById: {
        path: (args: { id: string }) => `/gateway/*/model-chats/saved-chat-item-by-id?id=${args.id}`,
        name: "deleteGatewayModelChatsSavedChatItemById",
        verb: ServerCallVerbs.Delete,
    },

    getGatewayModelChatsSavedFullSessions: {
        path: "/gateway/*/model-chats/saved-full-sessions",
        name: "getGatewayModelChatsSavedFullSessions",
        verb: ServerCallVerbs.Get,
    },
    deleteGatewayModelChatsSavedFullSession: {
        path: (args: { id: string }) => `/gateway/*/model-chats/saved-full-session?id=${args.id}`,
        name: "deleteGatewayModelChatsSavedFullSession",
        verb: ServerCallVerbs.Delete,
    },
    postGatewayModelChatsAddOrUpdateHistory: {
        path: "/gateway/*/model-chats/add-or-update-history",
        name: "postGatewayModelChatsAddOrUpdateHistory",
        verb: ServerCallVerbs.Post,
    },
    getGatewayModelChatsChatHistory: {
        path: "/gateway/*/model-chats/chat-history",
        name: "getGatewayModelChatsChatHistory",
        verb: ServerCallVerbs.Get,
    },
    deleteGatewayModelChatsChatHistorySession: {
        path: (args: { id: string }) => `/gateway/*/model-chats/chat-history-session?id=${args.id}`,
        name: "deleteGatewayModelChatsChatHistorySession",
        verb: ServerCallVerbs.Delete,
    },
    deleteGatewayModelChatsChatHistorySessionById: {
        path: (args: { id: string }) => `/gateway/*/model-chats/chat-history-session-by-id?id=${args.id}`,
        name: "deleteGatewayModelChatsChatHistorySessionById",
        verb: ServerCallVerbs.Delete,
    },
    getGatewayModelChatsPinnedChats: {
        path: "/gateway/*/model-chats/pinned-chats",
        name: "getGatewayModelChatsPinnedChats",
        verb: ServerCallVerbs.Get,
    },
    getGatewayModelChatsResources: {
        path: "/gateway/*/model-chats/resources",
        name: "getGatewayModelChatsResources",
        verb: ServerCallVerbs.Get,
    },
    getGatewayModelChatsConversationById: {
        path: (args: { id: string }) => `/gateway/*/model-chats/conversation/${args.id}`,
        name: "getGatewayModelChatsConversationById",
        verb: ServerCallVerbs.Get,
    },
    getGatewayModelChatsConversationOrphans: {
        path: (args: { id: string }) => `/gateway/*/model-chats/conversation/${args.id}/orphans`,
        name: "getGatewayModelChatsConversationOrphans",
        verb: ServerCallVerbs.Get,
    },
    getGatewayModelChatsConversationMessageOrphans: {
        path: (args: { id: string, messageId: string }) => `/gateway/*/model-chats/conversation/${args.id}/orphans/${args.messageId}`,
        name: "getGatewayModelChatsConversationMessageOrphans",
        verb: ServerCallVerbs.Get,
    },
    getGatewayModelChatsAgentRunById: {
        path: (args: { id: string }) => `/gateway/*/model-chats/agent-run/${args.id}`,
        name: "getGatewayModelChatsAgentRunById",
        verb: ServerCallVerbs.Get,
    },
    postGatewayModelChatsUpsertPersonality: {
        path: "/gateway/*/model-chats/personalities",
        name: "postGatewayModelChatsUpsertPersonality",
        verb: ServerCallVerbs.Post,
    },
    getGatewayModelChatsListPersonalities: {
        path: "/gateway/*/model-chats/personalities",
        name: "getGatewayModelChatsListPersonalities",
        verb: ServerCallVerbs.Get,
    },
    deleteGatewayModelChatsDeletePersonality: {
        path: (args: { id: string }) => `/gateway/*/model-chats/personalities/${args.id}`,
        name: "deleteGatewayModelChatsDeletePersonality",
        verb: ServerCallVerbs.Delete,
    },
    postGatewayModelChatsSetConversationPersonality: {
        path: (args: { id: string }) => `/gateway/*/model-chats/conversation/${args.id}/personality`,
        name: "postGatewayModelChatsSetConversationPersonality",
        verb: ServerCallVerbs.Post,
    },
    postGatewayModelChatsPinChatSession: {
        path: "/gateway/*/model-chats/pin-chat-session",
        name: "postGatewayModelChatsPinChatSession",
        verb: ServerCallVerbs.Post,
    },
    deleteGatewayModelChatsUnpinChatSession: {
        path: "/gateway/*/model-chats/unpin-chat-session",
        name: "deleteGatewayModelChatsUnpinChatSession",
        verb: ServerCallVerbs.Delete,
    },
    postGatewayModelChatsToggleStarred: {
        path: "/gateway/*/model-chats/toggle-starred",
        name: "postGatewayModelChatsToggleStarred",
        verb: ServerCallVerbs.Post,
    },
    postGatewayModelChatsMigrateFromLocalStorage: {
        path: "/gateway/*/model-chats/migrate-from-localstorage",
        name: "postGatewayModelChatsMigrateFromLocalStorage",
        verb: ServerCallVerbs.Post,
    },
    getGatewayModelChatsStats: {
        path: "/gateway/*/model-chats/stats",
        name: "getGatewayModelChatsStats",
        verb: ServerCallVerbs.Get,
    },
    postGatewayProjectsAddUser: {
        path: "/gateway/*/projects/add-user",
        name: "postGatewayProjectsAddUser",
        verb: ServerCallVerbs.Post,
    },
    postGatewayProjectsRemoveUser: {
        path: "/gateway/*/projects/remove-user",
        name: "postGatewayProjectsRemoveUser",
        verb: ServerCallVerbs.Post,
    },
    getGatewayProjectsUsers: {
        path: (args: { projectSlug: string; projectId: string }) =>
            `/gateway/*/projects/users/${args.projectId}`,
        name: "getGatewayProjectsUsers",
        verb: ServerCallVerbs.Get,
    },
    postGatewayProject: {
        path: "/gateway/*/project",
        name: "postGatewayProject",
        verb: ServerCallVerbs.Post,
    },
    postSetInferredStructure: {
        path: (args: { recordSpaceSlug: string; projectSlug: string }) =>
            `/${args.projectSlug}/${args.recordSpaceSlug}/set-inferred-structure`,
        name: "postSetInferredStructure",
        verb: ServerCallVerbs.Post,
    },
    postGetInferredStructure: {
        path: (args: { recordSpaceSlug: string; projectSlug: string }) =>
            `/${args.projectSlug}/${args.recordSpaceSlug}/get-inferred-structure`,
        name: "postGetInferredStructure",
        verb: ServerCallVerbs.Post,
    },
    postSetStructure: {
        path: (args: { recordSpaceSlug: string; projectSlug: string }) =>
            `/${args.projectSlug}/${args.recordSpaceSlug}/set-structure`,
        name: "postSetStructure",
        verb: ServerCallVerbs.Post,
    },
    postUtilsGetEmbedding: {
        path: "/utils/*/get-embedding",
        name: "postUtilsGetEmbedding",
        verb: ServerCallVerbs.Post,
    },
    postGatewayModelChatsPublishConversation: {
        path: "/gateway/*/model-chats/publish-conversation",
        name: "postGatewayModelChatsPublishConversation",
        verb: ServerCallVerbs.Post,
    },
    postGatewayModelChatsUnpublishConversation: {
        path: "/gateway/*/model-chats/unpublish-conversation",
        name: "postGatewayModelChatsUnpublishConversation",
        verb: ServerCallVerbs.Post,
    },
    getGatewayModelChatsPublishedConversations: {
        path: "/gateway/*/model-chats/published-conversations",
        name: "getGatewayModelChatsPublishedConversations",
        verb: ServerCallVerbs.Get,
    },
    getAllGatewayModelChatsPublishedConversations: {
        path: "/gateway/*/public/published-conversations",
        name: "getAllGatewayModelChatsPublishedConversations",
        verb: ServerCallVerbs.Get,
    },
    getGatewayModelChatsPublishedConversation: {
        path: (args: { id: string }) => `/gateway/*/public/published-conversation/${args.id}`,
        name: "getGatewayModelChatsPublishedConversation",
        verb: ServerCallVerbs.Get,
    },
    getGatewayModelChatsModels: {
        path: "/gateway/*/model-chats/models",
        name: "getGatewayModelChatsModels",
        verb: ServerCallVerbs.Get,
    },
    deleteGatewayModelChatsPublishedConversation: {
        path: (args: { id: string }) => `/gateway/*/model-chats/published-conversation/${args.id}`,
        name: "deleteGatewayModelChatsPublishedConversation",
        verb: ServerCallVerbs.Delete,
    },
    getGatewayIntegrationsGmailConnect: {
        path: "/gateway/*/integrations/gmail/connect",
        name: "getGatewayIntegrationsGmailConnect",
        verb: ServerCallVerbs.Get,
    },
    getGatewayIntegrationsGmailStatus: {
        path: "/gateway/*/integrations/gmail/status",
        name: "getGatewayIntegrationsGmailStatus",
        verb: ServerCallVerbs.Get,
    },
    deleteGatewayIntegrationsGmail: {
        path: "/gateway/*/integrations/gmail",
        name: "deleteGatewayIntegrationsGmail",
        verb: ServerCallVerbs.Delete,
    },
    getGatewayIntegrationsLinkedinConnect: {
        path: (args: { reauthorize?: boolean }) =>
            args?.reauthorize
                ? "/gateway/*/integrations/linkedin/connect?reauthorize=1"
                : "/gateway/*/integrations/linkedin/connect",
        name: "getGatewayIntegrationsLinkedinConnect",
        verb: ServerCallVerbs.Get,
    },
    getGatewayIntegrationsLinkedinStatus: {
        path: "/gateway/*/integrations/linkedin/status",
        name: "getGatewayIntegrationsLinkedinStatus",
        verb: ServerCallVerbs.Get,
    },
    deleteGatewayIntegrationsLinkedin: {
        path: "/gateway/*/integrations/linkedin",
        name: "deleteGatewayIntegrationsLinkedin",
        verb: ServerCallVerbs.Delete,
    },
    postGatewayAdminGrantCredits: {
        path: "/gateway/*/admin/grant-credits",
        name: "postGatewayAdminGrantCredits",
        verb: ServerCallVerbs.Post,
    },
    getGatewayAdminStatus: {
        path: "/gateway/*/admin/status",
        name: "getGatewayAdminStatus",
        verb: ServerCallVerbs.Get,
    },
    getGatewayAdminCreditsHistory: {
        path: "/gateway/*/admin/credits-history",
        name: "getGatewayAdminCreditsHistory",
        verb: ServerCallVerbs.Get,
    },
    getGatewayAdminUsersSearch: {
        path: (args: { q: string }) => `/gateway/*/admin/users/search?q=${encodeURIComponent(args.q)}`,
        name: "getGatewayAdminUsersSearch",
        verb: ServerCallVerbs.Get,
    },
    postGatewayAudioTranscribe: {
        path: "/gateway/*/audio/transcribe",
        name: "postGatewayAudioTranscribe",
        verb: ServerCallVerbs.Post,
    },
    postGatewayAudioSynthesize: {
        path: "/gateway/*/audio/synthesize",
        name: "postGatewayAudioSynthesize",
        verb: ServerCallVerbs.Post,
    },
};

