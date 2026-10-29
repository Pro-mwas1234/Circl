package com.tinyfocuscircles.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.tinyfocuscircles.app.data.NetworkClient
import com.tinyfocuscircles.app.data.UserDto
import com.tinyfocuscircles.app.ui.AuthScreen
import com.tinyfocuscircles.app.ui.DashboardScreen
import com.tinyfocuscircles.app.ui.FocusRoomScreen
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            var currentUser by remember { mutableStateOf<UserDto?>(null) }
            var currentRoomId by remember { mutableStateOf<String?>(null) }

            val scope = rememberCoroutineScope()

            LaunchedEffect(Unit) {
                scope.launch {
                    try {
                        val res = NetworkClient.apiService.getMe()
                        if (res.user != null) {
                            currentUser = res.user
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }

            if (currentUser == null) {
                AuthScreen(onAuthSuccess = { user ->
                    currentUser = user
                })
            } else if (currentRoomId != null) {
                FocusRoomScreen(
                    sessionId = currentRoomId!!,
                    currentUser = currentUser!!,
                    onLeaveRoom = { currentRoomId = null }
                )
            } else {
                DashboardScreen(
                    user = currentUser!!,
                    onEnterRoom = { roomId ->
                        currentRoomId = roomId
                    },
                    onLogout = {
                        scope.launch {
                            try {
                                NetworkClient.apiService.logout()
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                            currentUser = null
                        }
                    }
                )
            }
        }
    }
}
