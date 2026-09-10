import assert from 'node:assert/strict'
import test from 'node:test'
import {
    SocketClient,
    type SocketFactory,
    type SocketIoOptions,
    type SocketLike,
    type SocketTicketRequester,
    validateSocketAccess,
    validateSocketTarget,
} from './client'
import type { SocketAccess, SocketTarget } from './types'

class FakeSocket implements SocketLike {
    connected = false
    readonly options: SocketIoOptions
    readonly sentMessages: string[] = []
    private readonly handlers = new Map<string, Set<(...args: never[]) => void>>()

    constructor(options: SocketIoOptions) {
        this.options = options
    }

    on(event: 'connect', callback: () => void): SocketLike
    on(event: 'connect_error', callback: (error: Error) => void): SocketLike
    on(event: 'disconnect', callback: (reason: string) => void): SocketLike
    on(event: 'message', callback: (text: string) => void): SocketLike
    on(event: string, callback: (...args: never[]) => void): SocketLike
    on(event: string, callback: (...args: never[]) => void): SocketLike {
        const eventHandlers = this.handlers.get(event) ?? new Set<(...args: never[]) => void>()
        eventHandlers.add(callback)
        this.handlers.set(event, eventHandlers)
        return this
    }

    off(event: 'connect', callback?: () => void): SocketLike
    off(event: 'connect_error', callback?: (error: Error) => void): SocketLike
    off(event: 'disconnect', callback?: (reason: string) => void): SocketLike
    off(event: 'message', callback?: (text: string) => void): SocketLike
    off(event: string, callback?: (...args: never[]) => void): SocketLike
    off(event: string, callback?: (...args: never[]) => void): SocketLike {
        const eventHandlers = this.handlers.get(event)
        if (!eventHandlers) return this
        if (callback) eventHandlers.delete(callback)
        else eventHandlers.clear()
        return this
    }

    emit(event: 'message', payload: string): SocketLike
    emit(event: string, ...args: unknown[]): SocketLike
    emit(event: string, ...args: unknown[]): SocketLike {
        if (event === 'message' && typeof args[0] === 'string') this.sentMessages.push(args[0])
        return this
    }

    removeAllListeners(event?: string): SocketLike {
        if (event) this.handlers.delete(event)
        else this.handlers.clear()
        return this
    }

    disconnect(): SocketLike {
        this.connected = false
        return this
    }

    trigger(event: 'connect'): void
    trigger(event: 'disconnect' | 'message', value: string): void
    trigger(event: string, ...args: never[]): void {
        if (event === 'connect') this.connected = true
        if (event === 'disconnect') this.connected = false
        this.handlers.get(event)?.forEach((handler) => handler(...args))
    }
}

function createAccess(scope: SocketAccess['scope'], ticket: string): SocketAccess {
    return {
        ticket,
        expires_at: 1,
        websocket_url: 'https://realtime.example.com',
        websocket_path: '/socket.io/',
        websocket_channel_id: `${scope}-channel`,
        scope,
        access_role: 'member',
        settlement_protocol_version: 1,
    }
}

const roomTarget: SocketTarget = { scope: 'room', roomId: 42 }

test('validates socket targets and ticket responses before opening a connection', () => {
    assert.doesNotThrow(() => validateSocketTarget(roomTarget))
    assert.throws(() => validateSocketTarget({ scope: 'room', roomId: 0 }), /房间 ID 无效/)

    assert.deepEqual(
        validateSocketAccess(createAccess('room', 'ticket-1'), roomTarget),
        createAccess('room', 'ticket-1'),
    )
    assert.throws(
        () => validateSocketAccess({ ...createAccess('home', 'ticket-1'), scope: 'home' }, roomTarget),
        /授权范围与请求不一致/,
    )
    assert.throws(
        () => validateSocketAccess({ ...createAccess('room', 'ticket-1'), websocket_path: 'socket.io' }, roomTarget),
        /授权信息不完整/,
    )
})

test('connects, joins, dispatches messages and reconnects with a fresh ticket', async () => {
    const sockets: FakeSocket[] = []
    const socketFactory: SocketFactory = (_url, options) => {
        const socket = new FakeSocket(options)
        sockets.push(socket)
        return socket
    }
    const ticketAccesses = [createAccess('room', 'ticket-1'), createAccess('room', 'ticket-2')]
    const ticketRequests: Array<{ path: string; target: SocketTarget }> = []
    const ticketRequester: SocketTicketRequester = async (path, target) => {
        ticketRequests.push({ path, target })
        const access = ticketAccesses.shift()
        if (!access) throw new Error('no fake ticket')
        return access
    }

    const client = new SocketClient({
        connectTimeoutMs: 100,
        reconnectDelaysMs: [0],
        socketFactory,
        ticketRequester,
    })
    const receivedMessages: string[] = []
    const unsubscribe = client.onMessage((message) => receivedMessages.push(message.type))
    const firstConnect = client.connect(roomTarget, { user_id: 'user-1' })

    await Promise.resolve()
    assert.deepEqual(ticketRequests[0], { path: '/game-wss/ticket', target: roomTarget })
    assert.equal(sockets.length, 1)
    assert.deepEqual(sockets[0]?.options, {
        path: '/socket.io/',
        transports: ['websocket'],
        query: { ticket: 'ticket-1' },
        forceNew: true,
        reconnection: false,
        rememberUpgrade: true,
        timeout: 100,
    })

    const firstSocket = sockets[0]
    assert.ok(firstSocket)
    firstSocket.trigger('connect')
    const joinMessage = JSON.parse(firstSocket.sentMessages[0] ?? '{}') as { request_id?: string; type?: string }
    assert.equal(joinMessage.type, 'game.join')
    assert.ok(joinMessage.request_id)
    firstSocket.trigger('message', JSON.stringify({ type: 'game.joined', request_id: 'wrong-request' }))
    assert.equal(client.isConnected(), false)
    firstSocket.trigger('message', JSON.stringify({ type: 'game.joined', request_id: joinMessage.request_id }))
    assert.equal((await firstConnect).ticket, 'ticket-1')
    assert.equal(client.isConnected(), true)
    assert.deepEqual(receivedMessages, ['game.joined'])
    assert.equal(client.send({ type: 'game.broadcast', body: { value: 1 } }), true)
    firstSocket.trigger('message', '{not-json')
    assert.deepEqual(receivedMessages, ['game.joined'])
    unsubscribe()

    firstSocket.trigger('disconnect', 'transport close')
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(sockets.length, 2)
    assert.equal(ticketRequests.length, 2)
    const secondSocket = sockets[1]
    assert.ok(secondSocket)
    assert.equal(JSON.parse(secondSocket.sentMessages[0] ?? '{}').type, undefined)
    secondSocket.trigger('connect')
    const secondJoinMessage = JSON.parse(secondSocket.sentMessages[0] ?? '{}') as { request_id?: string }
    secondSocket.trigger('message', JSON.stringify({ type: 'game.joined', request_id: secondJoinMessage.request_id }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(client.isConnected(), true)

    client.disconnect()
    assert.equal(client.isConnected(), false)
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(sockets.length, 2)
    assert.equal(client.send({ type: 'game.broadcast' }), false)
})
