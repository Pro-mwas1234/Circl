package com.tinyfocuscircles.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tinyfocuscircles.app.data.ChatMessageDto
import com.tinyfocuscircles.app.data.NetworkClient
import com.tinyfocuscircles.app.data.ParticipantDto
import com.tinyfocuscircles.app.data.ParticipantUpdateRequest
import com.tinyfocuscircles.app.data.SessionDto
import com.tinyfocuscircles.app.data.SocketManager
import com.tinyfocuscircles.app.data.UserDto
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FocusRoomScreen(
    sessionId: String,
    currentUser: UserDto,
    onLeaveRoom: () -> Unit
) {
    var session by remember { mutableStateOf<SessionDto?>(null) }
    var participants by remember { mutableStateOf<List<ParticipantDto>>(emptyList()) }
    var messages by remember { mutableStateOf<List<ChatMessageDto>>(emptyList()) }
    var remainingSeconds by remember { mutableStateOf(50 * 60) }
    var myGoal by remember { mutableStateOf("") }
    var myCameraOn by remember { mutableStateOf(false) }
    var myStatus by remember { mutableStateOf("pending") }
    var chatInput by remember { mutableStateOf("") }

    val scope = rememberCoroutineScope()
    val socketManager = remember { SocketManager() }

    LaunchedEffect(remainingSeconds) {
        if (remainingSeconds > 0) {
            delay(1000L)
            remainingSeconds -= 1
        }
    }

    LaunchedEffect(sessionId) {
        scope.launch {
            try {
                val res = NetworkClient.apiService.getSession(sessionId)
                if (res.session != null) {
                    val s = res.session
                    session = s
                    participants = s.participants
                    messages = s.chatMessages

                    val myP = s.participants.find { it.userId == currentUser.id }
                    if (myP != null) {
                        myGoal = myP.goal ?: ""
                        myCameraOn = myP.cameraOn
                        myStatus = myP.status
                    }

                    socketManager.connect(NetworkClient.baseUrl, sessionId, currentUser) { event, data ->
                        when (event) {
                            "goal-updated" -> {
                                val uId = data.optString("userId")
                                val g = data.optString("goal")
                                participants = participants.map {
                                    if (it.userId == uId) it.copy(goal = g) else it
                                }
                            }
                            "camera-toggled" -> {
                                val uId = data.optString("userId")
                                val cam = data.optBoolean("cameraOn")
                                participants = participants.map {
                                    if (it.userId == uId) it.copy(cameraOn = cam) else it
                                }
                            }
                            "status-updated" -> {
                                val uId = data.optString("userId")
                                val st = data.optString("status")
                                participants = participants.map {
                                    if (it.userId == uId) it.copy(status = st) else it
                                }
                            }
                            "chat-message" -> {
                                val msg = ChatMessageDto(
                                    id = data.optString("id"),
                                    userId = data.optString("userId"),
                                    username = data.optString("username"),
                                    text = data.optString("text")
                                )
                                messages = messages + msg
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            socketManager.disconnect()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(session?.circle?.name ?: "Focus Room", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text("Work Type: ${session?.circle?.workType ?: "Deep Work"}", color = Color(0xFF818CF8), fontSize = 11.sp)
                    }
                },
                navigationIcon = {
                    TextButton(onClick = onLeaveRoom) {
                        Text("← Back", color = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        containerColor = Color(0xFF0F172A)
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("SYNCHRONIZED TIMER", color = Color(0xFF818CF8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    val mins = remainingSeconds / 60
                    val secs = remainingSeconds % 60
                    val formatted = "%02d:%02d".format(mins, secs)
                    Text(formatted, color = Color.White, fontSize = 42.sp, fontWeight = FontWeight.Bold)
                }
            }

            Text("CIRCLE MEMBERS (${participants.size}/6)", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(participants) { p ->
                    val isMe = p.userId == currentUser.id
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isMe) Color(0xFF312E81) else Color(0xFF1E293B)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "${p.user.username} ${if (isMe) "(You)" else ""}",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )

                                if (isMe) {
                                    TextButton(onClick = {
                                        myCameraOn = !myCameraOn
                                        scope.launch {
                                            NetworkClient.apiService.updateParticipant(sessionId, ParticipantUpdateRequest(cameraOn = myCameraOn))
                                            socketManager.emitCameraToggle(sessionId, currentUser.id, myCameraOn)
                                        }
                                    }) {
                                        Text(if (myCameraOn) "📹 Camera ON" else "📷 Camera OFF", fontSize = 11.sp, color = Color.White)
                                    }
                                } else {
                                    Text(if (p.cameraOn) "📹 Active" else "📷 Off", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                }
                            }

                            if (isMe) {
                                OutlinedTextField(
                                    value = myGoal,
                                    onValueChange = {
                                        myGoal = it
                                        socketManager.emitGoalUpdate(sessionId, currentUser.id, it)
                                    },
                                    placeholder = { Text("What I'm finishing this session...", color = Color(0xFF94A3B8), fontSize = 11.sp) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                                )
                            } else {
                                Text(
                                    text = p.goal.takeIf { !it.isNullOrBlank() } ?: "No goal declared yet",
                                    color = Color(0xFFCBD5E1),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                            }

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Status:", color = Color(0xFF94A3B8), fontSize = 10.sp)

                                if (isMe) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        listOf("done", "partial", "blocked").forEach { st ->
                                            FilterChip(
                                                selected = myStatus == st,
                                                onClick = {
                                                    myStatus = st
                                                    scope.launch {
                                                        NetworkClient.apiService.updateParticipant(sessionId, ParticipantUpdateRequest(status = st))
                                                        socketManager.emitStatusUpdate(sessionId, currentUser.id, st)
                                                    }
                                                },
                                                label = { Text(st.uppercase(), fontSize = 9.sp) }
                                            )
                                        }
                                    }
                                } else {
                                    Text(p.status.uppercase(), color = Color(0xFF6EE7B7), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = chatInput,
                    onValueChange = { chatInput = it },
                    placeholder = { Text("Send message...", color = Color(0xFF94A3B8)) },
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Button(onClick = {
                    if (chatInput.isNotBlank()) {
                        val txt = chatInput
                        chatInput = ""
                        socketManager.emitSendMessage(sessionId, currentUser, txt)
                    }
                }) {
                    Text("Send")
                }
            }
        }
    }
}
