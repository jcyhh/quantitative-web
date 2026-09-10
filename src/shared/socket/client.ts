import io from 'socket.io-client'
import { apiClient } from '../api'
import { HttpError, type RequestOptions } from '../api'
import { sharedConfig } from '../config'
import type {
    SocketAccess,
    SocketConnectionEvent,
    SocketConnectionState,
    SocketMessage,
    SocketOutgoingMessage,
    SocketScope,
    SocketTarget,
} from './types'

export interface SocketIoOptions {
    path: string
    transports: string[]
    query: Record<string, string>
    forceNew: boolean
    reconnection: boolean
    rememberUpgrade: boolean
    timeout: number
}

export interface SocketLike {
    connected: boolean
    on(event: 'connect', callback: () => void): SocketLike
    on(event: 'connect_error', callback: (error: Error) => void): SocketLike
    on(event: 'disconnect', callback: (reason: string) => void): SocketLike
    on(event: 'message', callback: (text: string) => void): SocketLike
    on(event: string, callback: (...args: unknown[]) => void): SocketLike
    off(event: 'connect', callback?: () => void): SocketLike
    off(event: 'connect_error', callback?: (error: Error) => void): SocketLike
    off(event: 'disconnect', callback?: (reason: string) => void): SocketLike
    off(event: 'message', callback?: (text: string) => void): SocketLike
    off(event: string, callback?: (...args: unknown[]) => void): SocketLike
    emit(event: 'message', payload: string): SocketLike
    emit(event: string, ...args: unknown[]): SocketLike
    removeAllListeners(event?: string): SocketLike
    disconnect(): SocketLike
}

export type SocketFactory = (url: string, options: SocketIoOptions) => SocketLike

export interface SocketTicketRequestOptions {
    signal?: AbortSignal
    timeout: number
}

export type SocketTicketRequester = (
    path: string,
    target: SocketTarget,
    options: SocketTicketRequestOptions,
) => Promise<unknown>

export interface SocketClientOptions {
    ticketPath?: string
    connectTimeoutMs?: number
    reconnectDelaysMs?: readonly number[]
    socketFactory?: SocketFactory
    ticketRequester?: SocketTicketRequester
}

type MessageHandler = (message: SocketMessage) => void
type StateHandler = (event: SocketConnectionEvent) => void

class SocketStaleError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SocketStaleError'
    }
}

export class SocketError extends Error {
    readonly code: string | null

    constructor(message: string, code: string | null = null) {
        super(message)
        this.name = 'SocketError'
        this.code = code
    }
}

function defaultSocketFactory(url: string, options: SocketIoOptions): SocketLike {
    return io(url, options)
}

function defaultTicketRequester(
    path: string,
    target: SocketTarget,
    options: SocketTicketRequestOptions,
): Promise<unknown> {
    const requestOptions: RequestOptions = { timeout: options.timeout }
    if (options.signal) requestOptions.signal = options.signal
    return apiClient.post<unknown>(path, createTicketBody(target), requestOptions)
}

function createTicketBody(target: SocketTarget): Record<string, unknown> {
    return target.scope === 'room' ? { scope: target.scope, room_id: target.roomId } : { scope: target.scope }
}

function cloneTarget(target: SocketTarget): SocketTarget {
    return target.scope === 'room' ? { scope: target.scope, roomId: target.roomId } : { scope: target.scope }
}

function isSameTarget(left: SocketTarget | null, right: SocketTarget): boolean {
    if (!left || left.scope !== right.scope) return false
    return left.scope !== 'room' || (right.scope === 'room' && left.roomId === right.roomId)
}

function getUserInfoFingerprint(userInfo: Record<string, unknown>): string {
    const userId = userInfo.user_id ?? userInfo.id
    if (userId !== undefined && userId !== null) return String(userId)

    try {
        return JSON.stringify(userInfo) ?? ''
    } catch {
        return ''
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseSocketMessage(text: string): SocketMessage | null {
    try {
        const value: unknown = JSON.parse(text)
        if (!isRecord(value) || typeof value.type !== 'string') return null
        return value as SocketMessage
    } catch {
        return null
    }
}

function getMessageError(message: SocketMessage): SocketError {
    const rawError = message.error
    const error = isRecord(rawError) ? rawError : null
    const code = typeof error?.code === 'string' ? error.code : null
    const errorMessage = typeof error?.message === 'string' ? error.message : 'Socket 握手失败'
    return new SocketError(errorMessage, code)
}

function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error))
}

function hasSocketScope(value: unknown): value is SocketScope {
    return value === 'home' || value === 'lobby' || value === 'global' || value === 'room'
}

export function validateSocketTarget(target: SocketTarget): void {
    if (target.scope === 'room' && (!Number.isInteger(target.roomId) || target.roomId <= 0)) {
        throw new SocketError('Socket 房间 ID 无效')
    }
}

export function validateSocketAccess(rawAccess: unknown, target: SocketTarget): SocketAccess {
    if (!isRecord(rawAccess)) throw new SocketError('Socket Ticket 响应格式无效')

    const ticket = typeof rawAccess.ticket === 'string' ? rawAccess.ticket.trim() : ''
    const websocketUrl = typeof rawAccess.websocket_url === 'string' ? rawAccess.websocket_url.trim() : ''
    const websocketPath = typeof rawAccess.websocket_path === 'string' ? rawAccess.websocket_path.trim() : ''
    const websocketChannelId =
        typeof rawAccess.websocket_channel_id === 'string' ? rawAccess.websocket_channel_id.trim() : ''
    const expiresAt = Number(rawAccess.expires_at)
    const scope = rawAccess.scope
    const accessRole = rawAccess.access_role

    let url: URL
    try {
        url = new URL(websocketUrl)
    } catch {
        throw new SocketError('Socket Ticket 返回的连接地址无效')
    }

    if (!ticket || !websocketPath.startsWith('/') || !websocketChannelId) {
        throw new SocketError('Socket Ticket 返回的授权信息不完整')
    }
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
        throw new SocketError('Socket Ticket 返回的连接协议无效')
    }
    if (!hasSocketScope(scope) || scope !== target.scope) {
        throw new SocketError('Socket Ticket 返回的授权范围与请求不一致')
    }
    if (accessRole !== 'member' && accessRole !== 'observer') {
        throw new SocketError('Socket Ticket 返回的访问角色无效')
    }
    if (!Number.isInteger(expiresAt) || expiresAt <= 0) {
        throw new SocketError('Socket Ticket 返回的过期时间无效')
    }

    const settlementProtocolVersion = rawAccess.settlement_protocol_version
    const access: SocketAccess = {
        ticket,
        expires_at: expiresAt,
        websocket_url: websocketUrl,
        websocket_path: websocketPath,
        websocket_channel_id: websocketChannelId,
        scope,
        access_role: accessRole,
    }

    if (settlementProtocolVersion !== undefined) {
        const parsedVersion = Number(settlementProtocolVersion)
        if (parsedVersion !== 1 && parsedVersion !== 2) {
            throw new SocketError('Socket Ticket 返回的结算协议无效')
        }
        access.settlement_protocol_version = parsedVersion
    }

    return access
}

export class SocketClient {
    private readonly ticketPath: string
    private readonly connectTimeoutMs: number
    private readonly reconnectDelaysMs: readonly number[]
    private readonly socketFactory: SocketFactory
    private readonly ticketRequester: SocketTicketRequester
    private socket: SocketLike | null = null
    private pendingSocket: SocketLike | null = null
    private access: SocketAccess | null = null
    private target: SocketTarget | null = null
    private userInfo: Record<string, unknown> | null = null
    private userInfoFingerprint: string | null = null
    private connectPromise: Promise<SocketAccess> | null = null
    private ticketAbortController: AbortController | null = null
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    private handshakeTimer: ReturnType<typeof setTimeout> | null = null
    private reconnectDelayQueue: readonly number[]
    private connectionGeneration = Symbol('initial-socket-generation')
    private intentionalDisconnect = true
    private messageHandlers = new Set<MessageHandler>()
    private stateHandlers = new Set<StateHandler>()

    constructor(options: SocketClientOptions = {}) {
        this.ticketPath = options.ticketPath ?? sharedConfig.socket.ticketPath
        this.connectTimeoutMs = options.connectTimeoutMs ?? sharedConfig.socket.connectTimeoutMs
        this.reconnectDelaysMs = options.reconnectDelaysMs ?? sharedConfig.socket.reconnectDelaysMs
        this.socketFactory = options.socketFactory ?? defaultSocketFactory
        this.ticketRequester = options.ticketRequester ?? defaultTicketRequester
        this.reconnectDelayQueue = [...this.reconnectDelaysMs]
    }

    connect(target: SocketTarget, userInfo: Record<string, unknown>): Promise<SocketAccess> {
        validateSocketTarget(target)
        const nextTarget = cloneTarget(target)
        const nextUserInfo = { ...userInfo }
        const nextUserInfoFingerprint = getUserInfoFingerprint(nextUserInfo)
        const sameConnection =
            isSameTarget(this.target, nextTarget) && this.userInfoFingerprint === nextUserInfoFingerprint

        if (sameConnection && this.socket?.connected && this.access) {
            return Promise.resolve(this.access)
        }
        if (sameConnection && this.connectPromise) return this.connectPromise

        this.intentionalDisconnect = false
        this.clearReconnectTimer()
        this.target = nextTarget
        this.userInfo = nextUserInfo
        this.userInfoFingerprint = nextUserInfoFingerprint
        this.access = null
        this.cancelActiveConnection()
        return this.connectWithFreshTicket()
    }

    onMessage(handler: MessageHandler): () => void {
        this.messageHandlers.add(handler)
        return () => this.messageHandlers.delete(handler)
    }

    onStateChange(handler: StateHandler): () => void {
        this.stateHandlers.add(handler)
        return () => this.stateHandlers.delete(handler)
    }

    send(message: SocketOutgoingMessage): boolean {
        if (!this.socket?.connected || !message.type) return false

        try {
            this.socket.emit('message', JSON.stringify(message))
            return true
        } catch {
            return false
        }
    }

    disconnect(): void {
        this.intentionalDisconnect = true
        this.clearReconnectTimer()
        this.target = null
        this.userInfo = null
        this.userInfoFingerprint = null
        this.access = null
        this.cancelActiveConnection()
        this.emitState('disconnected')
    }

    isConnected(): boolean {
        return Boolean(this.socket?.connected)
    }

    getAccess(): SocketAccess | null {
        return this.access
    }

    private connectWithFreshTicket(force = false): Promise<SocketAccess> {
        if (!this.target || !this.userInfo) {
            return Promise.reject(new SocketError('Socket 身份或授权目标缺失'))
        }
        if (this.connectPromise && !force) return this.connectPromise
        if (force) this.cancelActiveConnection()

        const generation = Symbol('socket-generation')
        this.connectionGeneration = generation
        const target = cloneTarget(this.target)
        const userInfo = { ...this.userInfo }
        const ticketAbortController = new AbortController()
        this.ticketAbortController = ticketAbortController
        this.emitState('connecting')

        let operation: Promise<SocketAccess>
        operation = (async (): Promise<SocketAccess> => {
            try {
                const rawAccess = await this.ticketRequester(this.ticketPath, target, {
                    signal: ticketAbortController.signal,
                    timeout: this.connectTimeoutMs,
                })
                const access = validateSocketAccess(rawAccess, target)
                if (!this.isCurrentConnection(generation, target)) {
                    throw new SocketStaleError('Socket 取票期间授权目标已变更')
                }

                return await this.openSocket(access, target, generation, userInfo)
            } catch (error) {
                const normalizedError = normalizeError(error)
                this.handleConnectionFailure(normalizedError, generation)
                throw normalizedError
            }
        })()
        this.connectPromise = operation

        const clearOperation = (): void => {
            if (this.ticketAbortController === ticketAbortController) this.ticketAbortController = null
            if (this.connectPromise === operation) this.connectPromise = null
        }
        void operation.then(clearOperation, clearOperation)
        return operation
    }

    private openSocket(
        access: SocketAccess,
        target: SocketTarget,
        generation: symbol,
        userInfo: Record<string, unknown>,
    ): Promise<SocketAccess> {
        return new Promise<SocketAccess>((resolve, reject) => {
            const socket = this.socketFactory(access.websocket_url, {
                path: access.websocket_path,
                transports: [sharedConfig.socket.transport],
                query: { ticket: access.ticket },
                forceNew: true,
                reconnection: false,
                rememberUpgrade: true,
                timeout: this.connectTimeoutMs,
            })
            const joinRequestId = createRequestId('join')
            let settled = false

            this.pendingSocket = socket

            const cleanupHandshake = (): void => {
                socket.off('connect', handleConnect)
                socket.off('connect_error', handleConnectError)
                socket.off('disconnect', handleDisconnectBeforeJoin)
                socket.off('message', handleJoinMessage)
                if (this.handshakeTimer) {
                    clearTimeout(this.handshakeTimer)
                    this.handshakeTimer = null
                }
                if (this.pendingSocket === socket) this.pendingSocket = null
            }

            const failHandshake = (error: unknown): void => {
                if (settled) return
                settled = true
                cleanupHandshake()
                this.destroySocketInstance(socket)
                reject(normalizeError(error))
            }

            const handleConnect = (): void => {
                if (settled) return
                if (!this.isCurrentConnection(generation, target)) {
                    failHandshake(new SocketStaleError('Socket 连接已被新授权替代'))
                    return
                }
                socket.on('message', handleJoinMessage)
                if (!emitJoinRequest(socket, access.scope, userInfo, joinRequestId)) {
                    failHandshake(new SocketError('Socket join 信息无法序列化'))
                }
            }

            const handleJoinMessage = (text: string): void => {
                const message = parseSocketMessage(text)
                if (!message) return
                if (message.type === 'error') {
                    failHandshake(getMessageError(message))
                    return
                }
                if (
                    message.request_id !== joinRequestId ||
                    (message.type !== 'game.joined' && message.type !== 'global.joined')
                ) {
                    return
                }
                if (!this.isCurrentConnection(generation, target)) {
                    failHandshake(new SocketStaleError('Socket 握手已被新授权替代'))
                    return
                }

                settled = true
                cleanupHandshake()
                this.socket = socket
                this.access = access
                this.reconnectDelayQueue = [...this.reconnectDelaysMs]
                this.bindSocketEvents(socket, message)
                this.emitMessage(message)
                this.emitState('connected')
                resolve(access)
            }

            const handleConnectError = (error: Error): void => failHandshake(error)
            const handleDisconnectBeforeJoin = (): void => {
                failHandshake(new SocketError('Socket 在加入频道前断开'))
            }

            socket.on('connect', handleConnect)
            socket.on('connect_error', handleConnectError)
            socket.on('disconnect', handleDisconnectBeforeJoin)
            this.handshakeTimer = setTimeout(
                () => failHandshake(new SocketError('Socket 连接或加入频道超时')),
                this.connectTimeoutMs,
            )
        })
    }

    private bindSocketEvents(socket: SocketLike, handshakeMessage?: SocketMessage): void {
        let ignoredHandshakeKey = handshakeMessage ? getMessageKey(handshakeMessage) : null
        socket.on('message', (text: string) => {
            const message = parseSocketMessage(text)
            if (message && ignoredHandshakeKey === getMessageKey(message)) {
                ignoredHandshakeKey = null
                return
            }
            if (message) this.emitMessage(message)
        })
        socket.on('disconnect', () => {
            if (this.socket !== socket) return
            this.socket = null
            this.access = null
            this.emitState('disconnected')
            if (!this.intentionalDisconnect) this.scheduleReconnect()
        })
    }

    private emitMessage(message: SocketMessage): void {
        this.messageHandlers.forEach((handler) => handler(message))
    }

    private emitState(state: SocketConnectionState, error?: Error): void {
        const event: SocketConnectionEvent = {
            state,
            target: this.target ? cloneTarget(this.target) : null,
        }
        if (error) event.error = error
        this.stateHandlers.forEach((handler) => handler(event))
    }

    private handleConnectionFailure(error: Error, generation: symbol): void {
        if (!this.isCurrentGeneration(generation) || this.intentionalDisconnect) return
        if (error instanceof SocketStaleError) return

        this.emitState('failed', error)
        if (error instanceof HttpError && error.status === 401) return
        this.scheduleReconnect()
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer || this.intentionalDisconnect || !this.target || !this.userInfo) return

        const [delay = 0, ...remainingDelays] = this.reconnectDelayQueue
        this.reconnectDelayQueue = remainingDelays.length > 0 ? remainingDelays : this.reconnectDelaysMs
        this.emitState('reconnecting')
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            if (this.target && this.userInfo && !this.intentionalDisconnect) {
                void this.connectWithFreshTicket(true).catch(() => undefined)
            }
        }, delay)
    }

    private clearReconnectTimer(): void {
        if (!this.reconnectTimer) return
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
    }

    private cancelActiveConnection(): void {
        this.connectionGeneration = Symbol('cancelled-socket-generation')
        this.ticketAbortController?.abort()
        this.ticketAbortController = null
        if (this.handshakeTimer) {
            clearTimeout(this.handshakeTimer)
            this.handshakeTimer = null
        }

        const pendingSocket = this.pendingSocket
        const activeSocket = this.socket
        this.pendingSocket = null
        this.socket = null
        this.connectPromise = null
        if (pendingSocket) this.destroySocketInstance(pendingSocket)
        if (activeSocket && activeSocket !== pendingSocket) this.destroySocketInstance(activeSocket)
    }

    private destroySocketInstance(socket: SocketLike): void {
        socket.removeAllListeners()
        socket.disconnect()
    }

    private isCurrentGeneration(generation: symbol): boolean {
        return this.connectionGeneration === generation
    }

    private isCurrentConnection(generation: symbol, target: SocketTarget): boolean {
        if (!this.isCurrentGeneration(generation) || !this.target) return false
        if (target.scope === 'room') {
            return this.target.scope === 'room' && this.target.roomId === target.roomId
        }
        return this.target.scope === target.scope
    }
}

function createRequestId(prefix: string): string {
    const uuid = globalThis.crypto?.randomUUID?.()
    return `${prefix}-${uuid ?? Math.random().toString(36).slice(2)}`
}

function getMessageKey(message: SocketMessage): string {
    return `${message.type}:${message.request_id ?? ''}`
}

function emitJoinRequest(
    socket: SocketLike,
    scope: SocketScope,
    userInfo: Record<string, unknown>,
    requestId: string,
): boolean {
    try {
        socket.emit(
            'message',
            JSON.stringify({
                type: scope === 'global' ? 'global.join' : 'game.join',
                request_id: requestId,
                user_info: userInfo,
            }),
        )
        return true
    } catch {
        return false
    }
}

export const socketClient = new SocketClient()
