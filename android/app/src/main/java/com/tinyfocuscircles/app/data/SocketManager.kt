package com.tinyfocuscircles.app.data

import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

class SocketManager {
    private var socket: Socket? = null

    fun connect(baseUrl: String, sessionId: String, user: UserDto, onEvent: (String, JSONObject) -> Unit) {
        try {
            val opts = IO.Options()
            opts.forceNew = true
            opts.reconnection = true

            socket = IO.socket(baseUrl, opts)

            socket?.on(Socket.EVENT_CONNECT) {
                val joinObj = JSONObject().apply {
                    put("sessionId", sessionId)
                    put("user", JSONObject().apply {
                        put("id", user.id)
                        put("username", user.username)
                        put("email", user.email)
                    })
                }
                socket?.emit("join-room", joinObj)
            }

            listOf("user-joined", "goal-updated", "camera-toggled", "status-updated", "chat-message", "timer-synced").forEach { eventName ->
                socket?.on(eventName) { args ->
                    if (args.isNotEmpty() && args[0] is JSONObject) {
                        onEvent(eventName, args[0] as JSONObject)
                    }
                }
            }

            socket?.connect()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun emitGoalUpdate(sessionId: String, userId: String, goal: String) {
        val obj = JSONObject().apply {
            put("sessionId", sessionId)
            put("userId", userId)
            put("goal", goal)
        }
        socket?.emit("goal-update", obj)
    }

    fun emitCameraToggle(sessionId: String, userId: String, cameraOn: Boolean) {
        val obj = JSONObject().apply {
            put("sessionId", sessionId)
            put("userId", userId)
            put("cameraOn", cameraOn)
        }
        socket?.emit("camera-toggle", obj)
    }

    fun emitStatusUpdate(sessionId: String, userId: String, status: String) {
        val obj = JSONObject().apply {
            put("sessionId", sessionId)
            put("userId", userId)
            put("status", status)
        }
        socket?.emit("status-update", obj)
    }

    fun emitSendMessage(sessionId: String, user: UserDto, message: String) {
        val obj = JSONObject().apply {
            put("sessionId", sessionId)
            put("user", JSONObject().apply {
                put("id", user.id)
                put("username", user.username)
            })
            put("message", message)
        }
        socket?.emit("send-message", obj)
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
    }
}
