package com.claritysolutions.app

import android.app.Application
import com.claritysolutions.app.seed.DataSeeder
import com.claritysolutions.app.notification.ScheduleWorker

class ClarityApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        DataSeeder.seedDatabase(this)
        ScheduleWorker.setupPeriodicWork(this)
    }
}
