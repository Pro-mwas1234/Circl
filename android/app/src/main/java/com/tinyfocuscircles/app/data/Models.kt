package com.tinyfocuscircles.app.data

import com.google.gson.annotations.SerializedName

data class UserDto(
    val id: String,
    val email: String,
    val username: String,
    val avatar: String? = null
)

data class AuthResponse(
    val user: UserDto? = null,
    val error: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class SignupRequest(
    val email: String,
    val username: String,
    val password: String
)

data class GoogleAuthRequest(
    val email: String,
    val username: String
)

data class CircleMemberDto(
    val id: String,
    val userId: String,
    val user: UserDto
)

data class CircleDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val workType: String,
    val durationMins: Int,
    val isStanding: Boolean,
    val timeSlot: String? = null,
    val inviteCode: String,
    val streak: Int,
    val organizer: UserDto,
    val members: List<CircleMemberDto> = emptyList()
)

data class CirclesResponse(
    val circles: List<CircleDto>? = null,
    val error: String? = null
)

data class CreateCircleRequest(
    val name: String,
    val workType: String,
    val durationMins: Int,
    val isStanding: Boolean,
    val timeSlot: String
)

data class ParticipantDto(
    val id: String? = null,
    val sessionId: String? = null,
    val userId: String,
    val user: UserDto,
    val goal: String? = null,
    val cameraOn: Boolean = false,
    val status: String = "pending"
)

data class ChatMessageDto(
    val id: String? = null,
    val userId: String,
    val username: String,
    val text: String,
    val createdAt: String? = null
)

data class SessionDto(
    val id: String,
    val circleId: String,
    val status: String,
    val startTime: String,
    val endTime: String,
    val durationMins: Int,
    val circle: CircleDto,
    val participants: List<ParticipantDto> = emptyList(),
    val chatMessages: List<ChatMessageDto> = emptyList()
)

data class SessionResponse(
    val session: SessionDto? = null,
    val error: String? = null
)

data class ParticipantUpdateRequest(
    val goal: String? = null,
    val cameraOn: Boolean? = null,
    val status: String? = null
)

data class ParticipantUpdateResponse(
    val participant: ParticipantDto? = null,
    val streakUpdated: Boolean = false,
    val newStreak: Int = 0,
    val error: String? = null
)
