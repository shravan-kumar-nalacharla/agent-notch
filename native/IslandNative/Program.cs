using System.Diagnostics;
using System.Text.Json;
using System.Runtime.InteropServices;
using VoiceFlow.Core;
using VoiceFlow.Core.Audio;
using VoiceFlow.Core.Input;
using VoiceFlow.Core.Speech;
using VoiceFlow.Windows;
using VoiceFlow.Windows.Audio;
using VoiceFlow.Windows.Dictation;
using VoiceFlow.Windows.Input;
using VoiceFlow.Windows.Native;
using static VoiceFlow.Windows.Native.NativeMethods;

namespace IslandFusionNative;
internal static partial class Program
{
    static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    static readonly object OutputGate = new();
    static Control Poster = null!;
    static TextInserter Inserter = null!;
    static HotkeyMonitor? Hotkeys;
    static Hotkey ConfiguredHotkey = Hotkey.CtrlShiftWin;
    static AudioCapture? Capture;
    static CaptureMeetingSource? MeetingMic, MeetingSystem;
    static SegmentCutter Cutter = new();
    static string SessionId = "", SessionKind = "dictation";
    static string InputDeviceId = "";
    static int SegmentIndex;
    static DateTime Started;
    static bool QuietBoost = true;
    static bool ChatOnSilence = true;
    static void LiveAudio(float[] samples) { if(PrivacyBlocked||samples.Length==0)return;var pcm=new byte[samples.Length*2];for(var i=0;i<samples.Length;i++)System.Buffers.Binary.BinaryPrimitives.WriteInt16LittleEndian(pcm.AsSpan(i*2,2),(short)Math.Clamp(samples[i]*32767,short.MinValue,short.MaxValue));Emit(new{type="voice.audio",id=SessionId,audio=Convert.ToBase64String(pcm)}); }
    static double SpeechSensitivity = .012;
    static IntPtr LastExternal;
    static IntPtr LastObservedForeground;
    static bool CaptureOverlayActive;
    static uint Parent;
    static Process? ParentProcess;
    static TypingContext Target = TypingContext.None;
    static readonly Dictionary<string, TypingContext> Targets = new();
    static readonly HashSet<string> AllowedActions = ["privacy.configure","privacy.status","privacy.calls","privacy.ptt","ping","system","media","media.level","media.control","volume","brightness","devices","voice.start","voice.finish","voice.cancel","voice.release","voice.configure","voice.diagnostics","voice.local","voice.insert","voice.copySelection","voice.pasteLast","meeting.start","meeting.stop","meeting.drain","capture","target","clipboard.safe","click","shortcut","type","speak","wake.configure","wake.interruption","wake.status","wake.test","wake.pause","screen.observe","screen.probe","agent.observe","agent.focus","agent.act","notification.status","notification.sound","shutdown"];
    static string LastText = "";
    static string SelectedText = "";
    static Task SelectionTask=Task.CompletedTask;
    static bool VoiceCancelled;
    static int LastLevelAt;
    [STAThread] static void Main(string[] args)
    {
        AllowedActions.Add("awake");
        AllowedActions.UnionWith(["capture.sources","capture.desktop","ocr.local"]);
        AllowedActions.Add("hardware");
        AllowedActions.UnionWith(["terminal.start","terminal.status","terminal.drain","terminal.write","terminal.resize","terminal.close","terminal.capabilities"]);
        Console.InputEncoding=System.Text.Encoding.UTF8;
        Console.OutputEncoding=new System.Text.UTF8Encoding(false);
        Parent = uint.TryParse(Environment.GetEnvironmentVariable("ISLAND_PARENT_PID"), out var p) ? p : 0;
        if(Parent!=0)try{ParentProcess=Process.GetProcessById((int)Parent);}catch{return;}
        Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
        Application.EnableVisualStyles();
        SynchronizationContext.SetSynchronizationContext(new WindowsFormsSynchronizationContext());
        Poster = new Control(); _ = Poster.Handle;
        Inserter = new TextInserter(new ClipboardService(Poster.Handle));
        using var timer = new System.Windows.Forms.Timer { Interval = 200 };
        timer.Tick += (_,_) => { Tick(); timer.Interval=Capture==null?200:33; }; timer.Start();
        Application.ApplicationExit += (_,_) => { StopAwake(); StopMicrophone(); ReminderSound?.Dispose(); ReminderAudio?.Dispose(); Wake?.Dispose(); Capture?.Dispose(); MeetingMic?.Dispose(); MeetingSystem?.Dispose(); Hotkeys?.Dispose(); ManualTerminal?.Dispose(); };
        _ = Task.Run(async () => {
            string? line;
            while ((line = await Console.In.ReadLineAsync()) != null)
            {
                if(line.Length > 2_000_000) { Emit(new {type="error",error="Request too large"}); continue; }
                var copy=line;
                try{using var urgent=JsonDocument.Parse(copy);if(S(urgent.RootElement,"action")=="privacy.configure"&&urgent.RootElement.TryGetProperty("value",out var pv)&&B(pv,"blocked",true))PrivacyBlocked=true;}catch{}
                Poster.BeginInvoke(async () => { string id=""; try { using var doc=JsonDocument.Parse(copy); var root=doc.RootElement; id=S(root,"id"); var action=S(root,"action"); if(!AllowedActions.Contains(action))throw new Exception("Unsupported native operation."); var value=await Handle(action,root.TryGetProperty("value",out var v)?v:default); Emit(new{id,ok=true,value}); } catch(Exception e) { Emit(new{id,ok=false,error=e.Message}); } });
            }
            Poster.BeginInvoke(Application.ExitThread);
        });
        Emit(new {type="ready",version=1,features=AllowedActions});
        Application.Run();
    }
    static void Emit(object value) { lock(OutputGate) Console.Out.WriteLine(JsonSerializer.Serialize(value,Json)); }
    static string S(JsonElement v,string name,string fallback="") => v.ValueKind==JsonValueKind.Object&&v.TryGetProperty(name,out var x)&&x.ValueKind==JsonValueKind.String?x.GetString()??fallback:fallback;
    static double N(JsonElement v,string name,double fallback=0) => v.ValueKind==JsonValueKind.Object&&v.TryGetProperty(name,out var x)&&x.TryGetDouble(out var n)?n:fallback;
    static bool B(JsonElement v,string name,bool fallback=false) => v.ValueKind==JsonValueKind.Object&&v.TryGetProperty(name,out var x)&&x.ValueKind is JsonValueKind.True or JsonValueKind.False?x.GetBoolean():fallback;
    static bool External(IntPtr hwnd) { if(hwnd==IntPtr.Zero)return false; GetWindowThreadProcessId(hwnd,out var pid); if(pid==(uint)Environment.ProcessId||pid==Parent)return false; try { using var process=Process.GetProcessById((int)pid);var name=process.ProcessName; return name is not "electron" and not "Agent Notch" and not "Island Fusion" && name is not "explorer"; } catch{return false;} }
    static void Tick()
    {
        if(AwakeDeadline>0&&Environment.TickCount64>=AwakeDeadline)StopAwake();
        try { if(ParentProcess?.HasExited==true){Application.ExitThread();return;} var front=GetForegroundWindow();if(External(front))LastExternal=front;
            if(front!=LastObservedForeground){LastObservedForeground=front;var captureOverlay=IsCaptureOverlay(front);if(captureOverlay!=CaptureOverlayActive){CaptureOverlayActive=captureOverlay;Emit(new{type="capture.overlay",active=captureOverlay});}}
            Ptt?.CheckHeld();
            if(PrivacyBlocked&&Capture!=null){StopMicrophone();return;}
            if(Capture!=null) { var elapsed=DateTime.UtcNow-Started; if(SessionKind=="chat"&&ChatOnSilence){if(Capture.CurrentLevel()>SpeechSensitivity){ChatHeardSpeech=true;LastChatSpeech=DateTime.UtcNow;}if((ChatHeardSpeech&&DateTime.UtcNow-LastChatSpeech>TimeSpan.FromSeconds(0.9))||(!ChatHeardSpeech&&elapsed.TotalSeconds>12)){_ = FinishVoice();return;}} if(elapsed.TotalMinutes>=20){_ = FinishVoice();return;} if(SessionKind=="live"){if(!Capture.IsRecording){CancelVoice();Emit(new{type="error",error="Windows stopped the microphone. Reconnect it and retry."});return;}var level=Capture.CurrentLevel();if(Capture.SampleCount>=1600)LiveAudio(Capture.Drain());Emit(new{type="voice.level",level,seconds=elapsed.TotalSeconds});return;} var tail=Capture.SamplesFrom(Cutter.OpenStart);var start=Cutter.OpenStart; if(Cutter.NextCut(tail,start) is {} range)Segment(tail[(range.Start.Value-start)..(range.End.Value-start)]); if(Environment.TickCount-LastLevelAt>=30){LastLevelAt=Environment.TickCount;Emit(new{type="voice.level",level=Capture.CurrentLevel(),seconds=elapsed.TotalSeconds});} }
        } catch(Exception e){Emit(new{type="error",error=e.Message});}
    }
    static async Task BeginVoice(string kind)
    {
        RequireMicrophone();var privacyGeneration=PrivacyEpoch;
        if(MeetingMic!=null)throw new Exception("Stop the meeting recording before starting voice.");
        if(Capture!=null)throw new Exception("Already recording.");
        if(Targets.Count>0||!SelectionTask.IsCompleted)throw new Exception("Still processing the previous dictation. Press Escape to cancel it.");
        var foreground=GetForegroundWindow();
        var hwnd=kind is "dictation" or "command"?foreground:External(foreground)?foreground:LastExternal;
        Target=FocusInfo.Describe(hwnd);
        if(Target.IsExcluded || await FocusInfo.FocusedFieldStateAsync(hwnd)==FieldState.Password)throw new Exception("Dictation is blocked in password fields and password managers.");
        RequireMicrophone();if(privacyGeneration!=PrivacyEpoch||kind=="ptt"&&Ptt?.Held!=true)throw new Exception("Recording activation expired.");
        SessionId=Guid.NewGuid().ToString("N");SessionKind=kind;SegmentIndex=0;Cutter=new SegmentCutter();Started=DateTime.UtcNow;
        Targets.Clear(); Targets[SessionId]=Target;
        VoiceCancelled=false;SelectedText="";SelectionTask=Task.CompletedTask;ChatHeardSpeech=false;LastChatSpeech=DateTime.UtcNow;
        try{Capture=new AudioCapture(string.IsNullOrWhiteSpace(InputDeviceId)?null:InputDeviceId);Capture.Start();Emit(new{type="voice.begin",id=SessionId,kind,app=Target.AppName,selected=SelectedText});if(kind=="command"){SelectionTask=ReadSelection();await SelectionTask;}}catch{CancelVoice();throw;}
    }
    static async Task ReadSelection(){var id=SessionId;var target=Target;string selected="";if(await Inserter.CheckTargetAsync(target)==null){selected=(await Inserter.CopySelectionAsync()??"");if(selected.Length>12000)throw new Exception("Select up to 12,000 characters for voice editing.");}if(id==SessionId&&!VoiceCancelled){SelectedText=selected;Emit(new{type="voice.selection",id,text=selected});}}
    static void Segment(float[] samples) { if(PrivacyBlocked||AudioMath.IsSilent(samples))return; var bytes=AudioMath.Wav(QuietBoost?AudioMath.Normalized(samples):samples);Emit(new{type="voice.segment",id=SessionId,index=SegmentIndex++,audio=Convert.ToBase64String(bytes),mime="audio/wav"}); }
    static async Task FinishVoice() { if(PrivacyBlocked){CancelVoice();return;}if(Capture==null)return;var id=SessionId;var samples=Capture.Stop();Capture.Dispose();Capture=null;if(SessionKind=="live")LiveAudio(samples);else if(Cutter.Finish(samples.Length) is {} range)Segment(samples[range]);if(Hotkeys!=null)Hotkeys.AwaitingResult=true;Hotkeys?.ResetSession(false);try{await SelectionTask;}catch(Exception e){if(id==SessionId)CancelVoice();Emit(new{type="error",error=e.Message});return;}if(!PrivacyBlocked&&id==SessionId&&!VoiceCancelled)Emit(new{type="voice.finish",id,kind=SessionKind,count=SegmentIndex,seconds=(DateTime.UtcNow-Started).TotalSeconds,app=Target.AppName}); }
    static void CancelVoice() { WakePaused=false;VoiceCancelled=true;Capture?.Dispose();Capture=null;Targets.Clear();if(Hotkeys!=null)Hotkeys.AwaitingResult=false;Hotkeys?.ResetSession(false);Emit(new{type="voice.cancel",id=SessionId}); }
    static async Task<object?> Handle(string action,JsonElement v)
    {
        if(action=="meeting.start"&&Capture!=null)throw new Exception("Stop the current voice session before recording a meeting.");
        switch(action)
        {
            case "privacy.configure":return ConfigurePrivacy(v);
            case "privacy.status":return PrivacyState();
            case "privacy.calls":return await CallingMicrophones(v);
            case "privacy.ptt":return ConfigurePtt(v);
            case "notification.status": return NotificationStatus();
            case "notification.sound": return PreviewReminderSound(v);
            case "wake.test": return await TestWakeAudio(v);
            case "wake.status": return new{enabled=Wake!=null,paused=WakePaused,name=CompanionName,recognizers=System.Speech.Recognition.SpeechRecognitionEngine.InstalledRecognizers().Select(r=>r.Culture.Name).ToArray()};
            case "wake.configure": return ConfigureWake(v);
            case "wake.interruption": InterruptEnabled=!PrivacyBlocked&&ListeningMode=="always"&&Wake!=null&&B(v,"enabled");return new{enabled=InterruptEnabled};
            case "wake.pause": WakePaused=B(v,"paused");return true;
            case "agent.observe": return await AgentObserve();
            case "agent.focus": return await AgentFocus(v);
            case "agent.act": return await AgentAct(v);
            case "screen.observe": return await ObserveScreen();
            case "screen.probe": return ScreenProbe();
            case "ping": return new{version=1,voiceFlow=true,recording=Capture!=null};
            case "voice.diagnostics": return new{helperVersion=1,ready=true,hotkey=ConfiguredHotkey.ToString(),inputDeviceId=InputDeviceId,hotkeySelfTest=HotkeySelfTest(),hookRunning=Hotkeys?.IsRunning==true,recording=Capture!=null,devices=await Task.Run(()=>new{inputs=AudioDevices.Inputs(),outputs=AudioDevices.Outputs()}),target=new{app=FocusInfo.Describe(LastExternal).AppName,title=FocusInfo.Title(LastExternal)}};
            case "target": return new{app=FocusInfo.Describe(LastExternal).AppName,title=FocusInfo.Title(LastExternal)};
            case "clipboard.safe": var current=FocusInfo.Capture();return !current.IsExcluded&&await FocusInfo.FocusedFieldStateAsync(current.Window)==FieldState.Normal;
            case "voice.configure":
                ChatOnSilence=B(v,"chatOnSilence",true);SpeechSensitivity=Math.Clamp(N(v,"sensitivity",.012),.001,.1);QuietBoost=B(v,"whisper",true);InputDeviceId=S(v,"inputDeviceId","");Hotkeys?.Dispose();Hotkeys=null;
                if(!PrivacyBlocked&&B(v,"enabled")){var hk=S(v,"hotkey","ctrlShiftWin");ConfiguredHotkey=hk=="rightCtrl"?Hotkey.RightCtrl:hk=="ctrlWin"?Hotkey.CtrlWin:hk=="rightAlt"?Hotkey.RightAlt:Hotkey.CtrlShiftWin;Hotkeys=new HotkeyMonitor(Poster,ConfiguredHotkey,async gesture=>{try{switch(gesture.Kind){case GestureActionKind.Begin:await BeginVoice(gesture.Session==VoiceFlow.Core.Input.SessionKind.Command?"command":"dictation");break;case GestureActionKind.BecomeCommand:if(SessionKind=="live")break;SessionKind="command";SelectionTask=ReadSelection();await SelectionTask;break;case GestureActionKind.Finish:await FinishVoice();break;case GestureActionKind.Cancel:CancelVoice();break;case GestureActionKind.Lock:Emit(new{type="voice.lock"});break;}}catch(Exception e){Emit(new{type="error",error=e.Message});}},_=>Emit(new{type="voice.pasteLast"}));Hotkeys.Start();}return new{enabled=Hotkeys!=null,hotkey=ConfiguredHotkey.ToString()};
            case "voice.start": RequireMicrophone();var voiceKind=S(v,"kind","dictation");if(ListeningMode=="ptt"&&voiceKind is not ("dictation" or "chat_input"))throw new Exception("Hold the push-to-talk key.");if(voiceKind is not ("dictation" or "chat_input" or "command" or "chat" or "live"))throw new Exception("Invalid recording kind.");await BeginVoice(voiceKind); Hotkeys?.EnterHandsFree();return new{id=SessionId};
            case "voice.finish": await FinishVoice();return true;
            case "voice.local": return await TranscribeLocal(v);
            case "voice.cancel": CancelVoice();return true;
            case "voice.release": Targets.Remove(S(v,"id"));if(Hotkeys!=null&&S(v,"id")==SessionId)Hotkeys.AwaitingResult=false;return true;
            case "voice.insert":
                RequireMicrophone();var insertEpoch=PrivacyEpoch;
                if(!Targets.TryGetValue(S(v,"id"),out var context))throw new Exception("Dictation target expired.");LastText=S(v,"text");if(LastText.Length>100000)throw new Exception("Text too long.");var front=GetForegroundWindow();GetWindowThreadProcessId(front,out var pid);if(pid==Parent)await TextInserter.RefocusAsync(context.Window);var expected=S(v,"expectedSelection");if(expected.Length>0&&await Inserter.CheckTargetAsync(context)==null&&(await Inserter.CopySelectionAsync()??"")!=expected){await Inserter.CopyAsync(LastText);Targets.Remove(S(v,"id"));return new{outcome="SelectionChanged"};}var outcome=await Inserter.InsertAsync(LastText,context,()=>!PrivacyBlocked&&PrivacyEpoch==insertEpoch);Targets.Remove(S(v,"id"));return new{outcome=outcome.ToString()};
            case "voice.pasteLast": if(LastText.Length==0)throw new Exception("No transcript yet.");return new{outcome=(await Inserter.InsertAsync(LastText,FocusInfo.Describe(LastExternal))).ToString()};
            case "voice.copySelection": return new{text=await Inserter.CopySelectionAsync()??""};
            case "devices": return await Task.Run(()=>new{inputs=AudioDevices.Inputs(),outputs=AudioDevices.Outputs()});
            case "meeting.start": RequireMicrophone();if(ListeningMode=="ptt")throw new Exception("Use manual mode for meeting recording.");if(MeetingMic!=null)throw new Exception("Meeting already recording.");try{MeetingMic=new CaptureMeetingSource(null,false);MeetingMic.StartCapture();if(B(v,"system",true)){MeetingSystem=new CaptureMeetingSource(null,true);MeetingSystem.StartCapture();}}catch{MeetingMic?.Dispose();MeetingSystem?.Dispose();MeetingMic=MeetingSystem=null;throw;}return true;
            case "meeting.drain": return DrainMeeting();
            case "meeting.stop": if(MeetingMic==null)return null;MeetingMic.StopCapture();MeetingSystem?.StopCapture();var audio=DrainMeeting();MeetingMic.Dispose();MeetingSystem?.Dispose();MeetingMic=MeetingSystem=null;return audio;
            case "media": return await MediaState(v);
            case "media.control": return await MediaControl(S(v,"command"),N(v,"position"),v);
            case "volume": return Volume(v);
            case "awake": return AwakeState(v);
            case "terminal.start":case "terminal.status":case "terminal.drain":case "terminal.write":case "terminal.resize":case "terminal.close":case "terminal.capabilities":return await TerminalAction(action,v);
            case "hardware": return await Task.Run(HardwareSnapshot);
            case "media.level": return new{peak=OutputPeak()};
            case "system": return SystemState();
            case "brightness": return Brightness(v);
            case "capture.sources": return CaptureSources();
            case "capture.desktop": return await CaptureDesktop(v,false);
            case "ocr.local": return await CaptureDesktop(v,true);
            case "capture": return CaptureScreen();
            case "click": return ClickAt(v);
            case "shortcut": return Shortcut(S(v,"keys"));
            case "type": var target=FocusInfo.Describe(GetForegroundWindow());return new{outcome=(await Inserter.InsertAsync(S(v,"text"),target)).ToString()};
            case "speak": RequireMicrophone();return Speak(S(v,"text"));
            case "shutdown": Application.ExitThread();return true;
            default: throw new Exception("Unsupported action.");
        }
    }
    static object HotkeySelfTest()
    {
        var recognizer=new GestureRecognizer();
        var processor=new HotkeyProcessor(Hotkey.CtrlShiftWin,recognizer);
        processor.Handle(new KeyInput(HotkeyProcessor.VK_LCONTROL,true),0);
        processor.Handle(new KeyInput(HotkeyProcessor.VK_LSHIFT,true),0.01);
        var begin=processor.Handle(new KeyInput(HotkeyProcessor.VK_LWIN,true),0.02).Actions;
        var finish=processor.Handle(new KeyInput(HotkeyProcessor.VK_LWIN,false),0.40).Actions;
        return new{chord="Ctrl+Shift+Win",began=begin.Any(a=>a.Kind==GestureActionKind.Begin),finished=finish.Any(a=>a.Kind==GestureActionKind.Finish)};
    }
    static object DrainMeeting() { RequireMicrophone();var mic=MeetingMic?.DrainSamples()??[];var system=MeetingSystem?.DrainSamples()??[];return new{you=mic.Length>0&&!AudioMath.IsSilent(mic)?Convert.ToBase64String(AudioMath.Wav(mic)):"",others=system.Length>0&&!AudioMath.IsSilent(system)?Convert.ToBase64String(AudioMath.Wav(system)):""}; }
}
