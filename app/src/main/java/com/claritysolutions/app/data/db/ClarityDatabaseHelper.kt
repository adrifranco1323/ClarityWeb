package com.claritysolutions.app.data.db

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class ClarityDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "clarity.db"
        const val DATABASE_VERSION = 5
    }

    override fun onCreate(db: SQLiteDatabase) {
        createPoolsTable(db)
        createVisitsTable(db)
        createUsersTable(db)
        seedUsers(db)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS visits")
        db.execSQL("DROP TABLE IF EXISTS pools")
        db.execSQL("DROP TABLE IF EXISTS users")
        onCreate(db)
    }

    private fun createPoolsTable(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE pools (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner TEXT NOT NULL,
                location TEXT,
                phone TEXT,
                email TEXT,
                managementCompany TEXT,
                size REAL,
                visitsPerWeek REAL,
                monthlyPayment REAL
            )
        """.trimIndent())
    }

    private fun createVisitsTable(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE visits (
                id TEXT PRIMARY KEY,
                fecha INTEGER NOT NULL,
                operador TEXT NOT NULL,
                operadorId TEXT,
                piscina TEXT NOT NULL,
                cloroInicial REAL,
                phInicial REAL,
                alcalinidadInicial REAL,
                durezaCalcica REAL,
                acidoCianuro REAL,
                notas TEXT,
                isCompleted INTEGER DEFAULT 0
            )
        """.trimIndent())
    }

    private fun createUsersTable(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                fullName TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )
        """.trimIndent())
    }

    private fun seedUsers(db: SQLiteDatabase) {
        db.execSQL("INSERT INTO users (id, fullName, email, password, role) VALUES ('1', 'Admin User', 'admin@clarity.com', 'admin123', 'ADMIN')")
        db.execSQL("INSERT INTO users (id, fullName, email, password, role) VALUES ('2', 'Operario User', 'operario@clarity.com', 'ope123', 'OPERARIO')")
    }
}
