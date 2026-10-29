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
import com.tinyfocuscircles.app.data.CircleDto
import com.tinyfocuscircles.app.data.CreateCircleRequest
import com.tinyfocuscircles.app.data.NetworkClient
import com.tinyfocuscircles.app.data.UserDto
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    user: UserDto,
    onEnterRoom: (String) -> Unit,
    onLogout: () -> Unit
) {
    var circles by remember { mutableStateOf<List<CircleDto>>(emptyList()) }
    var activeFilter by remember { mutableStateOf("all") }
    var showCreateDialog by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    fun loadCircles() {
        scope.launch {
            isLoading = true
            try {
                val res = NetworkClient.apiService.getCircles()
                if (res.circles != null) {
                    circles = res.circles
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadCircles()
    }

    val filteredCircles = circles.filter {
        when (activeFilter) {
            "standing" -> it.isStanding
            "dropin" -> !it.isStanding
            else -> true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Tiny Focus Circles", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Hi, ${user.username}", color = Color(0xFF818CF8), fontSize = 12.sp)
                    }
                },
                actions = {
                    TextButton(onClick = onLogout) {
                        Text("Sign Out", color = Color(0xFFF87171))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = Color(0xFF4F46E5),
                contentColor = Color.White
            ) {
                Text("+", fontSize = 24.sp)
            }
        },
        containerColor = Color(0xFF0F172A)
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = activeFilter == "all",
                    onClick = { activeFilter = "all" },
                    label = { Text("All") }
                )
                FilterChip(
                    selected = activeFilter == "standing",
                    onClick = { activeFilter = "standing" },
                    label = { Text("Standing") }
                )
                FilterChip(
                    selected = activeFilter == "dropin",
                    onClick = { activeFilter = "dropin" },
                    label = { Text("Drop-In") }
                )
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF6366F1))
                }
            } else if (filteredCircles.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No circles found. Create one!", color = Color(0xFF94A3B8))
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(filteredCircles) { circle ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (circle.isStanding) "Standing Circle" else "Drop-In",
                                        color = if (circle.isStanding) Color(0xFFFCD34D) else Color(0xFF6EE7B7),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (circle.isStanding) {
                                        Text(
                                            text = "🔥 ${circle.streak} wk streak",
                                            color = Color(0xFFF59E0B),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = circle.name,
                                    color = Color.White,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = "${circle.workType} • ${circle.durationMins} mins",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 12.sp
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = {
                                        scope.launch {
                                            try {
                                                val sessionRes = NetworkClient.apiService.joinOrCreateSession(circle.id)
                                                if (sessionRes.session != null) {
                                                    onEnterRoom(sessionRes.session.id)
                                                }
                                            } catch (e: Exception) {
                                                e.printStackTrace()
                                            }
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Text("Enter Focus Room")
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        var circleName by remember { mutableStateOf("") }
        var workType by remember { mutableStateOf("Deep Work") }
        var isStanding by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            containerColor = Color(0xFF1E293B),
            title = { Text("Create Circle", color = Color.White) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = circleName,
                        onValueChange = { circleName = it },
                        label = { Text("Circle Name", color = Color(0xFF94A3B8)) },
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = isStanding, onCheckedChange = { isStanding = it })
                        Text("Standing Circle (Weekly)", color = Color.White, fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        try {
                            NetworkClient.apiService.createCircle(
                                CreateCircleRequest(
                                    name = circleName,
                                    workType = workType,
                                    durationMins = 50,
                                    isStanding = isStanding,
                                    timeSlot = if (isStanding) "Weekly Slot" else "Drop-in"
                                )
                            )
                            showCreateDialog = false
                            loadCircles()
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }) {
                    Text("Create")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            }
        )
    }
}
