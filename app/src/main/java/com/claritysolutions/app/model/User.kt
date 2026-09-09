package com.claritysolutions.app.model

import java.util.UUID

enum class UserRole {
    ADMIN, OPERARIO, PENDIENTE
}

data class User(
    val id: String = UUID.randomUUID().toString(),
    val fullName: String = "",
    val email: String = "",
    val password: String = "",
    val role: UserRole = UserRole.PENDIENTE
)
