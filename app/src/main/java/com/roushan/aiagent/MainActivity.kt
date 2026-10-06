package com.roushan.aiaagent

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView

class MainActivity : Activity() {

    private lateinit var commandInput: EditText
    private lateinit var statusText: TextView
    private lateinit var logText: TextView

    private val updateReceiver = object : BroadcastReceiver() {

        override fun onReceive(
            context: Context?,
            intent: Intent?
        ) {

            val message =
                intent?.getStringExtra(
                    AgentAccessibilityService.EXTRA_MESSAGE
                ) ?: return

            statusText.text = message

            val old = logText.text.toString()

            logText.text =
                "$old\n$message"
        }
    }

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {

        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_main)

        commandInput =
            findViewById(R.id.commandInput)

        statusText =
            findViewById(R.id.statusText)

        logText =
            findViewById(R.id.logText)

        findViewById<Button>(
            R.id.accessibilityButton
        ).setOnClickListener {

            startActivity(
                Intent(
                    Settings.ACTION_ACCESSIBILITY_SETTINGS
                )
            )
        }

        findViewById<Button>(
            R.id.runButton
        ).setOnClickListener {

            val command =
                commandInput.text
                    .toString()
                    .trim()

            if (command.isEmpty()) {

                statusText.text =
                    "Command likho"

                return@setOnClickListener
            }

            if (!isAgentEnabled()) {

                statusText.text =
                    "Pehle Accessibility Service ON karo"

                startActivity(
                    Intent(
                        Settings.ACTION_ACCESSIBILITY_SETTINGS
                    )
                )

                return@setOnClickListener
            }

            AgentAccessibilityService
                .instance
                ?.runCommand(command)
                ?: run {

                    statusText.text =
                        "Agent service abhi start ho rahi hai; RUN dobara dabao."
                }
        }

        findViewById<Button>(
            R.id.stopButton
        ).setOnClickListener {

            AgentAccessibilityService
                .instance
                ?.stopAgent()

            statusText.text =
                "Stopped"
        }
    }

    private fun isAgentEnabled(): Boolean {

        val manager =
            getSystemService(
                ACCESSIBILITY_SERVICE
            ) as AccessibilityManager

        return manager
            .getEnabledAccessibilityServiceList(
                AccessibilityServiceInfo.FEEDBACK_ALL_MASK
            )
            .any {

                it.resolveInfo
                    .serviceInfo
                    .packageName == packageName &&

                it.resolveInfo
                    .serviceInfo
                    .name ==
                    AgentAccessibilityService::class.java.name
            }
    }

    override fun onResume() {

        super.onResume()

        val filter =
            IntentFilter(
                AgentAccessibilityService.ACTION_UPDATE
            )

        registerReceiver(
            updateReceiver,
            filter,
            RECEIVER_NOT_EXPORTED
        )
    }

    override fun onPause() {

        unregisterReceiver(
            updateReceiver
        )

        super.onPause()
    }
}
