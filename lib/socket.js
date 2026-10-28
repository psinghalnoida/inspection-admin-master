/**
 * Socket.IO Client Service (Admin)
 * Real-time communication for live location tracking
 */

import { io } from 'socket.io-client';
import { api } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map();
    }

    /**
     * Initialize and connect to Socket.IO server
     */
    async connect() {
        try {
            // If socket exists and is connected, reuse it
            if (this.socket?.connected) {
                return this.socket;
            }

            // If socket exists but is disconnected, try to reconnect manually
            if (this.socket) {
                this.socket.connect();
                return this.socket;
            }

            // Get access token from localStorage (Admin uses 'accessToken')
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

            if (!token) {
                console.log('❌ No auth token for socket connection');
                return null;
            }

            this.socket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: this.maxReconnectAttempts,
                timeout: 10000,
            });

            this.setupEventHandlers();

            // Wait for connection or timeout
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(this.socket);
                }, 5000);

                this.socket.on('connect', () => {
                    clearTimeout(timeout);
                    resolve(this.socket);
                });

                this.socket.on('connect_error', () => {
                    clearTimeout(timeout);
                    resolve(null);
                });
            });
        } catch (error) {
            console.error('❌ Socket connection error:', error);
            return null;
        }
    }

    /**
     * Setup socket event handlers
     */
    setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ Socket connected:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
            this.reconnectAttempts++;
        });
    }

    /**
     * Disconnect from socket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.listeners.clear();
        }
    }

    /**
     * Join a survey room for real-time updates
     */
    joinSurveyRoom(surveyId) {
        if (!this.socket?.connected) {
            return false;
        }

        this.socket.emit('join:survey', surveyId);
        console.log(`📍 Joining survey room: ${surveyId}`);
        return true;
    }

    /**
     * Leave a survey room
     */
    leaveSurveyRoom(surveyId) {
        if (!this.socket?.connected) return;
        this.socket.emit('leave:survey', surveyId);
        console.log(`📍 Leaving survey room: ${surveyId}`);
    }

    /**
     * Listen for location updates
     */
    onLocationUpdate(callback) {
        if (!this.socket) return () => { };

        const handler = (data) => {
            callback(data);
        };

        this.socket.on('location:updated', handler);
        this.listeners.set('location:updated', handler);

        return () => {
            this.socket?.off('location:updated', handler);
            this.listeners.delete('location:updated');
        };
    }

    /**
     * Listen for status updates
     */
    onStatusUpdate(callback) {
        if (!this.socket) return () => { };

        const handler = (data) => {
            callback(data);
        };

        this.socket.on('status:updated', handler);
        this.listeners.set('status:updated', handler);

        return () => {
            this.socket?.off('status:updated', handler);
            this.listeners.delete('status:updated');
        };
    }
    /**
     * Listen for dispute messages
     */
    onDisputeMessage(callback) {
        if (!this.socket) return () => { };

        const handler = (data) => {
            callback(data);
        };

        this.socket.on('dispute:message', handler);
        this.listeners.set('dispute:message', handler);

        return () => {
            this.socket?.off('dispute:message', handler);
            this.listeners.delete('dispute:message');
        };
    }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
