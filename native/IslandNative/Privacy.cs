using System.Text.Json;
using VoiceFlow.Windows.Native;
using static VoiceFlow.Windows.Native.NativeMethods;
namespace IslandFusionNative;
internal static partial class Program
{
    static volatile bool PrivacyBlocked=true;
    static long PrivacyEpoch;
    static string ListeningMode="manual";
    static HoldToTalk? Ptt;
    static System.Speech.Synthesis.SpeechSynthesizer? VoiceOutput;
    static object PrivacyState()=>new{blocked=PrivacyBlocked,mode=ListeningMode,epoch=PrivacyEpoch,recording=Capture!=null,wake=Wake!=null,meeting=MeetingMic!=null,ptt=Ptt?.Held==true};
    static void RequireMicrophone(){if(PrivacyBlocked)throw new Exception("Agent Notch microphone is muted.");}
    static void StopMicrophone(){CancelVoice();Wake?.Dispose();Wake=null;WakePaused=true;MeetingMic?.Dispose();MeetingSystem?.Dispose();MeetingMic=MeetingSystem=null;Hotkeys?.Dispose();Hotkeys=null;Ptt?.Dispose();Ptt=null;VoiceOutput?.SpeakAsyncCancelAll();}
    static object ConfigurePrivacy(JsonElement v){var epoch=(long)N(v,"epoch");if(epoch<PrivacyEpoch)return PrivacyState();PrivacyEpoch=epoch;PrivacyBlocked=B(v,"blocked",true);ListeningMode=S(v,"mode","manual");if(ListeningMode is not ("manual" or "ptt" or "always"))ListeningMode="manual";StopMicrophone();return PrivacyState();}
    static object ConfigurePtt(JsonElement v){Ptt?.Dispose();Ptt=null;if(!PrivacyBlocked&&ListeningMode=="ptt"&&B(v,"enabled")){Ptt=new HoldToTalk(S(v,"shortcut","Control+Alt+V"),B(v,"ready",true),S(v,"reason","Complete voice setup in Settings."));Ptt.Start();}return new{enabled=Ptt!=null};}
    // Active capture sessions identify microphone use, not a verified Discord call. No audio is read.
    static Task<object> CallingMicrophones(JsonElement v){var apps=v.TryGetProperty("apps",out var a)&&a.ValueKind==JsonValueKind.Array?a.EnumerateArray().Select(x=>x.GetString()??"").ToHashSet(StringComparer.OrdinalIgnoreCase):new HashSet<string>();return Task.Run<object>(()=>{try{using var enumerator=new NAudio.CoreAudioApi.MMDeviceEnumerator();var found=new List<string>();var devices=enumerator.EnumerateAudioEndPoints(NAudio.CoreAudioApi.DataFlow.Capture,NAudio.CoreAudioApi.DeviceState.Active);if(devices.Count==0)return new{known=false,active=false,apps=found};foreach(var device in devices){using(device){var sessions=device.AudioSessionManager.Sessions;for(int i=0;i<sessions.Count;i++){using var audio=sessions[i];if(audio.State!=NAudio.CoreAudioApi.Interfaces.AudioSessionState.AudioSessionStateActive)continue;try{using var process=System.Diagnostics.Process.GetProcessById((int)audio.GetProcessID);if(apps.Contains(process.ProcessName))found.Add(process.ProcessName);}catch{}}}}return new{known=true,active=found.Count>0,apps=found.Distinct().ToArray()};}catch{return new{known=false,active=false,apps=Array.Empty<string>()};}});}
    sealed class HoldToTalk : IDisposable
    {
        readonly string[] Parts;readonly int Key;readonly bool Ready;readonly string Reason;Thread? Worker;uint ThreadId;volatile bool Disposed;bool Swallowed;public volatile bool Held;
        public HoldToTalk(string shortcut,bool ready=true,string reason="Complete voice setup in Settings."){Parts=shortcut.Split('+');Ready=ready;Reason=reason.Length>300?reason[..300]:reason;var key=Parts[^1];Key=key=="Space"?0x20:key.Length==1?key[0]:key.StartsWith('F')&&int.TryParse(key[1..],out var f)&&f>=1&&f<=12?0x6F+f:throw new Exception("Invalid push-to-talk key.");if(!Parts.Contains("Control")&&!Parts.Contains("Alt"))throw new Exception("Push-to-talk needs Control or Alt.");}
        bool Modifiers()=>Parts.Contains("Control")==((GetAsyncKeyState(0x11)&0x8000)!=0)&&Parts.Contains("Alt")==((GetAsyncKeyState(0x12)&0x8000)!=0)&&Parts.Contains("Shift")==((GetAsyncKeyState(0x10)&0x8000)!=0);
        public void Start(){using var ready=new ManualResetEventSlim();Exception? error=null;Worker=new Thread(()=>{ThreadId=GetCurrentThreadId();using var hook=new KeyboardHook((vk,scan,down,flags,extra)=>{if(Disposed||((flags&0x10)!=0&&extra==InputSender.Marker))return false;if(vk==Key){if(!down&&Swallowed){Swallowed=false;if(Held)Release();return true;}if(down&&Swallowed)return true;if(down&&!Held&&Modifiers()){Held=true;Swallowed=true;Poster.BeginInvoke(async()=>{if(!Held||Disposed||PrivacyBlocked)return;if(!Ready){Emit(new{type="error",error=Reason,activation="ptt"});return;}try{await BeginVoice("ptt");}catch(Exception e){Emit(new{type="error",error=e.Message});}});return true;}if(Held){if(!down)Release();return true;}}if(Held&&!down&&vk is 0x11 or 0x12 or 0x10 or 0xA0 or 0xA1 or 0xA2 or 0xA3 or 0xA4 or 0xA5)Release();return false;});try{hook.Install();}catch(Exception e){error=e;}ready.Set();if(error==null)while(GetMessageW(out var msg,IntPtr.Zero,0,0)>0){} }){IsBackground=true,Name="Agent Notch push-to-talk"};Worker.Start();if(!ready.Wait(3000)||error!=null)throw new Exception("Push-to-talk keyboard hook unavailable.",error);}
        // The swallowed key has no reliable asynchronous state; its key-up is tracked by the hook.
        public void CheckHeld(){if(Held&&!Modifiers())Release();}
        void Release(){Held=false;Poster.BeginInvoke(async()=>{if(!Disposed&&Capture!=null&&SessionKind=="ptt")await FinishVoice();});}
        public void Dispose(){Disposed=true;Held=false;if(ThreadId!=0)PostThreadMessageW(ThreadId,WM_QUIT,UIntPtr.Zero,IntPtr.Zero);Worker?.Join(1000);}
    }
}
