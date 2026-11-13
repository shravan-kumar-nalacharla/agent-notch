import agent_notch as notch
notch.tile({"type":"card","children":[{"type":"text","text":"Drop a file on the notch","bold":True}]})
for event in notch.events():
    if event.get("type") == "files":
        count=len(event.get("paths", []))
        notch.badge({"text":str(count)})
        notch.log("Received %d explicit file path(s)" % count)
