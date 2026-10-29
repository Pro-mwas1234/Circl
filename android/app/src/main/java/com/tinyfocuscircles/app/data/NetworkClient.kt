package com.tinyfocuscircles.app.data

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @GET("api/auth/me")
    suspend fun getMe(): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("api/auth/signup")
    suspend fun signup(@Body request: SignupRequest): AuthResponse

    @POST("api/auth/google")
    suspend fun googleAuth(@Body request: GoogleAuthRequest): AuthResponse

    @POST("api/auth/me")
    suspend fun logout(): AuthResponse

    @GET("api/circles")
    suspend fun getCircles(@Query("mode") mode: String? = null): CirclesResponse

    @POST("api/circles")
    suspend fun createCircle(@Body request: CreateCircleRequest): AuthResponse

    @POST("api/circles/{id}/session")
    suspend fun joinOrCreateSession(@Path("id") circleId: String): SessionResponse

    @GET("api/sessions/{sessionId}")
    suspend fun getSession(@Path("sessionId") sessionId: String): SessionResponse

    @POST("api/sessions/{sessionId}/participant")
    suspend fun updateParticipant(
        @Path("sessionId") sessionId: String,
        @Body request: ParticipantUpdateRequest
    ): ParticipantUpdateResponse
}

object NetworkClient {
    var baseUrl: String = "http://10.0.2.2:3000/"

    private val cookieStore = mutableMapOf<String, List<Cookie>>()

    private val cookieJar = object : CookieJar {
        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            cookieStore[url.host] = cookies
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            return cookieStore[url.host] ?: emptyList()
        }
    }

    private val okHttpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
