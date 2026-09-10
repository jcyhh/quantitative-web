export type SocketScope = 'home' | 'lobby' | 'global' | 'room'

export type SocketTarget =
    { scope: 'home' } | { scope: 'lobby' } | { scope: 'global' } | { scope: 'room'; roomId: number }

export type SocketAccessRole = 'member' | 'observer'

export interface SocketAccess {
    ticket: string
    expires_at: number
    websocket_url: string
    websocket_path: string
    websocket_channel_id: string
    scope: SocketScope
    access_role: SocketAccessRole
    settlement_protocol_version?: number
}

export interface SocketMessage {
    type: string
    request_id?: string
    [key: string]: unknown
}

export interface SocketOutgoingMessage {
    type: string
    request_id?: string
    [key: string]: unknown
}

export type SocketConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'

export interface SocketConnectionEvent {
    state: SocketConnectionState
    target: SocketTarget | null
    error?: Error
}
