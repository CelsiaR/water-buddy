Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = Replace(WScript.ScriptFullName, "\start-hidden.vbs", "")
shell.Run "cmd /c npx electron .", 0, False
