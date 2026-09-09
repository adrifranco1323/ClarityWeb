package com.claritysolutions.app.model

import java.util.UUID

data class Pool(
    val id: String = UUID.randomUUID().toString(),
    val name: String = "",
    val owner: String = "",
    val location: String = "",
    val phone: String = "",
    val email: String = "",
    val managementCompany: String = "",
    val size: Double = 0.0,
    val visitsPerWeek: Double = 0.0,
    val scheduledDays: List<Int> = emptyList(), // 1=Mon, 2=Tue, ..., 7=Sun
    val monthlyPayment: Double = 0.0
)
