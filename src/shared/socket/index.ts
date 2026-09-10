import { SocketClient } from './client'
import type { SocketClientOptions } from './client'

export { SocketClient, SocketError, socketClient, validateSocketAccess, validateSocketTarget } from './client'
export type {
    SocketClientOptions,
    SocketFactory,
    SocketIoOptions,
    SocketLike,
    SocketTicketRequester,
    SocketTicketRequestOptions,
} from './client'
export type {
    SocketAccess,
    SocketAccessRole,
    SocketConnectionEvent,
    SocketConnectionState,
    SocketMessage,
    SocketOutgoingMessage,
    SocketScope,
    SocketTarget,
} from './types'

export function createSocketClient(options: SocketClientOptions = {}): SocketClient {
    return new SocketClient(options)
}
