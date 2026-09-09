package com.claritysolutions.app.data.repository

import java.util.Date
import android.content.ContentValues
import android.content.Context
import com.claritysolutions.app.data.db.ClarityDatabaseHelper
import com.claritysolutions.app.model.Pool
import com.claritysolutions.app.model.Visit
import com.claritysolutions.app.model.User
import com.claritysolutions.app.model.UserRole

class VisitRepository(context: Context) {

    private val dbHelper = ClarityDatabaseHelper(context)

    fun getAllVisits(): List<Visit> {
        val visits = mutableListOf<Visit>()
        val db = dbHelper.readableDatabase
        val cursor = db.rawQuery("SELECT * FROM visits ORDER BY fecha DESC", null)

        if (cursor.moveToFirst()) {
            do {
                visits.add(Visit(
                    id = cursor.getString(0),
                    fecha = cursor.getLong(1),
                    operador = cursor.getString(2),
                    operadorId = cursor.getString(3),
                    piscina = cursor.getString(4),
                    cloroInicial = cursor.getDouble(5),
                    phInicial = cursor.getDouble(6),
                    alcalinidadInicial = cursor.getDouble(7),
                    durezaCalcica = cursor.getDouble(8),
                    acidoCianuro = cursor.getDouble(9),
                    notas = cursor.getString(10)

                ))
            } while (cursor.moveToNext())
        }
        cursor.close()
        return visits
    }

    fun getAllPools(): List<Pool> {
        val pools = mutableListOf<Pool>()
        val db = dbHelper.readableDatabase
        val cursor = db.rawQuery("SELECT * FROM pools ORDER BY name ASC", null)

        if (cursor.moveToFirst()) {
            do {
                pools.add(Pool(
                    id = cursor.getString(0),
                    name = cursor.getString(1),
                    owner = cursor.getString(2),
                    location = cursor.getString(3),
                    phone = cursor.getString(4),
                    email = cursor.getString(5),
                    managementCompany = cursor.getString(6),
                    size = cursor.getDouble(7),
                    visitsPerWeek = cursor.getDouble(8),
                    monthlyPayment = cursor.getDouble(9)
                ))
            } while (cursor.moveToNext())
        }
        cursor.close()
        return pools
    }

    fun insertVisit(visit: Visit): Long {
        val db = dbHelper.writableDatabase
        val values = ContentValues().apply {
            put("id", visit.id)
            put("fecha", visit.fecha)
            put("operador", visit.operador)
            put("operadorId", visit.operadorId)
            put("piscina", visit.piscina)
            put("cloroInicial", visit.cloroInicial)
            put("phInicial", visit.phInicial)
            put("alcalinidadInicial", visit.alcalinidadInicial)
            put("durezaCalcica", visit.durezaCalcica)
            put("acidoCianuro", visit.acidoCianuro)
            put("notas", visit.notas)

        }
        return db.insertWithOnConflict("visits", null, values, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun updateVisit(visit: Visit): Int {
        val db = dbHelper.writableDatabase
        val values = ContentValues().apply {
            put("operador", visit.operador)
            put("operadorId", visit.operadorId)
            put("piscina", visit.piscina)
            put("cloroInicial", visit.cloroInicial)
            put("phInicial", visit.phInicial)
            put("alcalinidadInicial", visit.alcalinidadInicial)
            put("durezaCalcica", visit.durezaCalcica)
            put("acidoCianuro", visit.acidoCianuro)
            put("notas", visit.notas)

        }
        return db.update("visits", values, "id = ?", arrayOf(visit.id))
    }

    fun login(email: String, password: String): User? {
        val db = dbHelper.readableDatabase
        val cursor = db.rawQuery("SELECT * FROM users WHERE email = ? AND password = ?", arrayOf(email, password))
        var user: User? = null
        if (cursor.moveToFirst()) {
            user = User(
                id = cursor.getString(0),
                fullName = cursor.getString(1),
                email = cursor.getString(2),
                password = cursor.getString(3),
                role = UserRole.valueOf(cursor.getString(4))
            )
        }
        cursor.close()
        return user
    }

    fun insertPool(pool: Pool): Long {
        val db = dbHelper.writableDatabase
        val values = ContentValues().apply {
            put("id", pool.id)
            put("name", pool.name)
            put("owner", pool.owner)
            put("location", pool.location)
            put("phone", pool.phone)
            put("email", pool.email)
            put("managementCompany", pool.managementCompany)
            put("size", pool.size)
            put("visitsPerWeek", pool.visitsPerWeek)
            put("monthlyPayment", pool.monthlyPayment)
        }
        return db.insertWithOnConflict("pools", null, values, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun updatePool(pool: Pool): Int {
        val db = dbHelper.writableDatabase
        val values = ContentValues().apply {
            put("name", pool.name)
            put("owner", pool.owner)
            put("location", pool.location)
            put("phone", pool.phone)
            put("email", pool.email)
            put("managementCompany", pool.managementCompany)
            put("size", pool.size)
            put("visitsPerWeek", pool.visitsPerWeek)
            put("monthlyPayment", pool.monthlyPayment)
        }
        return db.update("pools", values, "id = ?", arrayOf(pool.id))
    }
}
