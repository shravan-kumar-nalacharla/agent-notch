from pathlib import Path
root=Path(__file__).resolve().parents[1]
def edit(name,a,b):
 p=root/name;s=p.read_text(encoding='utf-8');assert a in s,name;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
edit('native/vendor/VoiceFlow/Windows/TextInserter.cs',"InsertAsync(string text, TypingContext context)", "InsertAsync(string text, TypingContext context, Func<bool>? allowed = null)")
edit('native/vendor/VoiceFlow/Windows/TextInserter.cs',"if (problem is InsertResult.FocusChanged or InsertResult.CopiedOnly) await CopyAsync(clean);", "if (allowed?.Invoke() == false) return InsertResult.Blocked;\n            if (problem is InsertResult.FocusChanged or InsertResult.CopiedOnly) await CopyAsync(clean);")
# ReplaceAll has no optional guard; keep its existing behavior.
p=root/'native/vendor/VoiceFlow/Windows/TextInserter.cs';s=p.read_text(encoding='utf-8');i=s.index('public async Task<InsertResult> ReplaceAllAsync');s=s[:i]+s[i:].replace('            if (allowed?.Invoke() == false) return InsertResult.Blocked;\n','');p.write_text(s,encoding='utf-8')
edit('native/vendor/VoiceFlow/Windows/TextInserter.cs',"return await PasteAsync(clean, context.IsTerminal) ? InsertResult.Pasted : InsertResult.Failed;\n    }\n\n    /// <summary>Leaves", "if (allowed?.Invoke() == false) return InsertResult.Blocked;\n        return await PasteAsync(clean, context.IsTerminal, allowed) ? InsertResult.Pasted : InsertResult.Failed;\n    }\n\n    /// <summary>Leaves")
edit('native/vendor/VoiceFlow/Windows/TextInserter.cs',"PasteAsync(string text, bool terminal)", "PasteAsync(string text, bool terminal, Func<bool>? allowed = null)")
edit('native/vendor/VoiceFlow/Windows/TextInserter.cs',"var sent = terminal ? InputSender.ShiftInsert() : InputSender.CtrlV();", "var sent = allowed?.Invoke() != false && (terminal ? InputSender.ShiftInsert() : InputSender.CtrlV());")
edit('native/IslandNative/Program.cs',"RequireMicrophone();\n                if(!Targets", "RequireMicrophone();var insertEpoch=PrivacyEpoch;\n                if(!Targets")
edit('native/IslandNative/Program.cs',"await Inserter.InsertAsync(LastText,context)", "await Inserter.InsertAsync(LastText,context,()=>!PrivacyBlocked&&PrivacyEpoch==insertEpoch)")
