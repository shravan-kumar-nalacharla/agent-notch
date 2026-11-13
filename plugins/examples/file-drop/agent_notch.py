import json, sys
def send(value): print(json.dumps(value, separators=(",", ":")), flush=True)
def tile(view): send({"type":"tile", "view":view})
def badge(value): send({"type":"badge", "badge":value})
def log(message, level="info"): send({"type":"log", "level":level, "message":str(message)})
def events():
    for line in sys.stdin:
        try: yield json.loads(line)
        except Exception: continue
