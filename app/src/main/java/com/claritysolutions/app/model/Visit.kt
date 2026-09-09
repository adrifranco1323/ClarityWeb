package com.claritysolutions.app.model

import java.util.UUID

data class Visit(
    val id: String = UUID.randomUUID().toString(),
    val fecha: Long = System.currentTimeMillis(),
    val operador: String = "",
    val operadorId: String? = null,
    val piscina: String = "",
    val cloroInicial: Double = 0.0,
    val phInicial: Double = 0.0,
    val alcalinidadInicial: Double = 0.0,
    val durezaCalcica: Double = 0.0,
    val acidoCianuro: Double = 0.0,
    val notas: String = "",
    val hasAlguicida: Boolean = false,
    val hasAspirado: Boolean = false,
    val hasCepillado: Boolean = false,
    val hasLimpiezaCanasta: Boolean = false,
    val hasLimpiezaSkimer: Boolean = false,
    val hasLimpiezaCanastaBomba: Boolean = false,
    val hasCheckeoCuartoMaquinas: Boolean = false,
    val hasMantenimientoBomba: Boolean = false,
    val hasRellenoAgua: Boolean = false,
    val hasCloroShock: Boolean = false,
    val chlorineTablets: Int = 0,
    val arrivalPhoto1: String? = null,
    val arrivalPhoto1Time: Long? = null,
    val arrivalPhoto2: String? = null,
    val arrivalPhoto2Time: Long? = null,
    val afterPhoto1: String? = null,
    val afterPhoto1Time: Long? = null,
    val afterPhoto2: String? = null,
    val afterPhoto2Time: Long? = null,
    val exitPhoto: String? = null,
    val exitPhotoTime: Long? = null
)
