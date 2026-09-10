declare module 'socket.io-client' {
    interface SocketOptions {
        path?: string
        transports?: string[]
        query?: Record<string, string>
        forceNew?: boolean
        reconnection?: boolean
        rememberUpgrade?: boolean
        timeout?: number
    }

    interface Socket {
        connected: boolean
        on(event: 'connect', callback: () => void): Socket
        on(event: 'connect_error', callback: (error: Error) => void): Socket
        on(event: 'disconnect', callback: (reason: string) => void): Socket
        on(event: 'message', callback: (text: string) => void): Socket
        on(event: string, callback: (...args: unknown[]) => void): Socket
        off(event: 'connect', callback?: () => void): Socket
        off(event: 'connect_error', callback?: (error: Error) => void): Socket
        off(event: 'disconnect', callback?: (reason: string) => void): Socket
        off(event: 'message', callback?: (text: string) => void): Socket
        off(event: string, callback?: (...args: unknown[]) => void): Socket
        emit(event: 'message', payload: string): Socket
        emit(event: string, ...args: unknown[]): Socket
        removeAllListeners(event?: string): Socket
        disconnect(): Socket
    }

    interface SocketIoClient {
        (uri: string, options?: SocketOptions): Socket
    }

    const io: SocketIoClient
    export default io
}
