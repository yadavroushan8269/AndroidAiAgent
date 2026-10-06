package com.roushan.aiaagent

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.accessibility.AccessibilityNodeInfo

class AgentAccessibilityService :
    AccessibilityService() {

    companion object {

        var instance:
            AgentAccessibilityService? = null

        const val ACTION_UPDATE =
            "com.roushan.aiaagent.AGENT_UPDATE"

        const val EXTRA_MESSAGE =
            "message"
    }

    private val handler =
        Handler(Looper.getMainLooper())

    @Volatile
    private var stopped = false

    override fun onServiceConnected() {

        super.onServiceConnected()

        instance = this

        sendUpdate(
            "Agent service connected"
        )
    }

    override fun onDestroy() {

        instance = null

        super.onDestroy()
    }

    override fun onAccessibilityEvent(
        event:
            android.view.accessibility.AccessibilityEvent?
    ) = Unit

    override fun onInterrupt() = Unit

    fun stopAgent() {

        stopped = true

        handler.removeCallbacksAndMessages(
            null
        )

        sendUpdate(
            "Agent stopped"
        )
    }

    fun runCommand(
        command: String
    ) {

        stopped = false

        handler.removeCallbacksAndMessages(
            null
        )

        sendUpdate(
            "Understanding: $command"
        )

        val lower =
            command.lowercase()

        when {

            lower.contains("youtube") ->
                runYouTubeFlow(command)

            lower.contains("chrome") ->
                runChromeFlow(command)

            lower.contains("settings") ->
                openSettings()

            else -> {

                sendUpdate(
                    "I can currently automate YouTube, Chrome and Settings in Version 1"
                )
            }
        }
    }

    private fun runYouTubeFlow(
        command: String
    ) {

        sendUpdate(
            "Opening YouTube"
        )

        launchPackage(
            "com.google.android.youtube"
        )

        handler.postDelayed({

            if (stopped)
                return@postDelayed

            val query =
                extractSearchText(command)

            if (query.isNullOrBlank()) {

                sendUpdate(
                    "YouTube opened. Add words like 'search Python tutorial'."
                )

                return@postDelayed
            }

            sendUpdate(
                "Finding a text field"
            )

            val field =
                findEditable(
                    rootInActiveWindow
                )

            if (field != null) {

                sendUpdate(
                    "Typing: $query"
                )

                setText(
                    field,
                    query
                )

                handler.postDelayed({

                    if (
                        !stopped &&
                        clickSearchLike(
                            rootInActiveWindow
                        )
                    ) {

                        sendUpdate(
                            "Search clicked"
                        )

                    } else if (!stopped) {

                        sendUpdate(
                            "Text entered. Search button was not found automatically."
                        )
                    }

                }, 900)

            } else {

                sendUpdate(
                    "No text field found. Open YouTube search manually in this first version."
                )
            }

        }, 1800)
    }

    private fun runChromeFlow(
        command: String
    ) {

        sendUpdate(
            "Opening Chrome"
        )

        launchPackage(
            "com.android.chrome"
        )

        handler.postDelayed({

            if (stopped)
                return@postDelayed

            val query =
                extractSearchText(command)

            if (query.isNullOrBlank()) {

                sendUpdate(
                    "Chrome opened"
                )

                return@postDelayed
            }

            val field =
                findEditable(
                    rootInActiveWindow
                )

            if (field != null) {

                sendUpdate(
                    "Typing: $query"
                )

                setText(
                    field,
                    query
                )

                handler.postDelayed({

                    if (
                        !stopped &&
                        clickSearchLike(
                            rootInActiveWindow
                        )
                    ) {

                        sendUpdate(
                            "Search clicked"
                        )
                    }

                }, 700)

            } else {

                sendUpdate(
                    "Chrome address field was not detected"
                )
            }

        }, 1600)
    }

    private fun openSettings() {

        sendUpdate(
            "Opening Android Settings"
        )

        startActivity(
            Intent(
                Settings.ACTION_SETTINGS
            ).addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
            )
        )
    }

    private fun launchPackage(
        pkg: String
    ) {

        val launch =
            packageManager
                .getLaunchIntentForPackage(pkg)

        if (launch == null) {

            sendUpdate(
                "App not installed: $pkg"
            )

            return
        }

        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
        )

        startActivity(launch)
    }

    private fun extractSearchText(
        command: String
    ): String? {

        val patterns =
            listOf(

                Regex(
                    "search\\s+(.+)",
                    RegexOption.IGNORE_CASE
                ),

                Regex(
                    "search karo\\s+(.+)",
                    RegexOption.IGNORE_CASE
                ),

                Regex(
                    "search kar\\s+(.+)",
                    RegexOption.IGNORE_CASE
                ),

                Regex(
                    "dhoondo\\s+(.+)",
                    RegexOption.IGNORE_CASE
                )
            )

        for (pattern in patterns) {

            val match =
                pattern.find(command)

            if (match != null) {

                return match
                    .groupValues[1]
                    .trim()
            }
        }

        return null
    }

    private fun findEditable(
        node: AccessibilityNodeInfo?
    ): AccessibilityNodeInfo? {

        if (node == null)
            return null

        if (
            node.isEditable &&
            node.isVisibleToUser
        ) {

            return node
        }

        for (
            i in 0 until node.childCount
        ) {

            val found =
                findEditable(
                    node.getChild(i)
                )

            if (found != null)
                return found
        }

        return null
    }

    private fun setText(
        node: AccessibilityNodeInfo,
        text: String
    ) {

        val args =
            Bundle().apply {

                putCharSequence(
                    AccessibilityNodeInfo
                        .ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    text
                )
            }

        node.performAction(
            AccessibilityNodeInfo.ACTION_SET_TEXT,
            args
        )
    }

    private fun clickSearchLike(
        root: AccessibilityNodeInfo?
    ): Boolean {

        if (root == null)
            return false

        val labels =
            listOf(
                "search",
                "go",
                "enter",
                "खोज"
            )

        if (
            nodeMatches(
                root,
                labels
            )
        ) {

            return root.performAction(
                AccessibilityNodeInfo.ACTION_CLICK
            )
        }

        for (
            i in 0 until root.childCount
        ) {

            if (
                clickSearchLike(
                    root.getChild(i)
                )
            ) {

                return true
            }
        }

        return false
    }

    private fun nodeMatches(
        node: AccessibilityNodeInfo,
        labels: List<String>
    ): Boolean {

        val text =
            (
                node.text?.toString()
                    ?: ""
            ) +
            " " +
            (
                node.contentDescription
                    ?.toString()
                    ?: ""
            )

        val normalized =
            text.trim().lowercase()

        return node.isVisibleToUser &&
            labels.any {
                normalized == it ||
                normalized.contains(it)
            }
    }

    private fun sendUpdate(
        message: String
    ) {

        val intent =
            Intent(
                ACTION_UPDATE
            )
                .setPackage(packageName)
                .putExtra(
                    EXTRA_MESSAGE,
                    message
                )

        sendBroadcast(intent)
    }
}
