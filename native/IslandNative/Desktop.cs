using System.Diagnostics;
using System.Drawing.Imaging;
using System.Management;
using System.Runtime.InteropServices;
using System.Text.Json;
using NAudio.CoreAudioApi;
using Windows.Media.Control;
using Windows.Storage.Streams;
using VoiceFlow.Windows.Native;
using static VoiceFlow.Windows.Native.NativeMethods;

namespace IslandFusionNative;
internal static partial class Program
{
    static readonly Stopwatch CpuClock=Stopwatch.StartNew();
    static DateTime CpuAt=DateTime.UtcNow;
    static ulong CpuIdle,CpuKernel,CpuUser;
    static int CachedGpu = -1, GpuProbeRunning;
    static long GpuProbeAt = -10000;
    static int CachedGpuUsage()
    {
        // WMI can take seconds; never run it on the audio/keyboard message thread.
        if (Environment.TickCount64 - GpuProbeAt >= 10000 && Interlocked.CompareExchange(ref GpuProbeRunning, 1, 0) == 0)
        {
            GpuProbeAt = Environment.TickCount64;
            _ = Task.Run(() => { try { Volatile.Write(ref CachedGpu, GpuUsage()); } finally { Volatile.Write(ref GpuProbeRunning, 0); } });
        }
        return Volatile.Read(ref CachedGpu);
    }
    static int GpuUsage()
    {
        try
        {
            using var searcher=new ManagementObjectSearcher("root\\CIMV2","SELECT Name,UtilizationPercentage FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine");
            var total=0;
            foreach(ManagementObject item in searcher.Get())using(item)
            {
                var name=Convert.ToString(item["Name"])??"";
                if(!name.Contains("engtype_3D",StringComparison.OrdinalIgnoreCase))continue;
                total+=Convert.ToInt32(item["UtilizationPercentage"]??0);
            }
            return Math.Clamp(total,0,100);
        }
        catch{return -1;}
    }
    [DllImport("kernel32.dll")]static extern bool GetSystemTimes(out long idle,out long kernel,out long user);
    [StructLayout(LayoutKind.Sequential)]struct MemoryStatus{public uint length,load;public ulong total,available,pageTotal,pageAvailable,virtualTotal,virtualAvailable,extended;}
    [DllImport("kernel32.dll")]static extern bool GlobalMemoryStatusEx(ref MemoryStatus status);
    [DllImport("user32.dll")]static extern bool GetWindowRect(IntPtr window,out Rect rect);
    [DllImport("user32.dll")]static extern IntPtr GetKeyboardLayout(uint thread);
    [DllImport("shell32.dll")]static extern int SHQueryUserNotificationState(out int state);
    [StructLayout(LayoutKind.Sequential)]struct Rect{public int left,top,right,bottom;}
    [DllImport("user32.dll")]static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
    static object Volume(JsonElement v)
    {
        using var e=new MMDeviceEnumerator();using var device=e.GetDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia);
        if(v.ValueKind==JsonValueKind.Object&&v.TryGetProperty("level",out _))device.AudioEndpointVolume.MasterVolumeLevelScalar=(float)Math.Clamp(N(v,"level")/100,0,1);
        if(v.ValueKind==JsonValueKind.Object&&v.TryGetProperty("muted",out _))device.AudioEndpointVolume.Mute=B(v,"muted");
        return new{level=Math.Round(device.AudioEndpointVolume.MasterVolumeLevelScalar*100),muted=device.AudioEndpointVolume.Mute};
    }
    static object Brightness(JsonElement v)
    {
        if(v.ValueKind==JsonValueKind.Object&&v.TryGetProperty("level",out _)){using var methods=new ManagementObjectSearcher("root\\WMI","SELECT * FROM WmiMonitorBrightnessMethods");foreach(ManagementObject method in methods.Get())using(method)method.InvokeMethod("WmiSetBrightness",new object[]{1u,(byte)Math.Clamp(N(v,"level"),0,100)});}
        using var search=new ManagementObjectSearcher("root\\WMI","SELECT CurrentBrightness FROM WmiMonitorBrightness");var values=search.Get().Cast<ManagementObject>().Select(x=>Convert.ToInt32(x["CurrentBrightness"])).ToArray();if(values.Length==0)throw new Exception("This display does not expose brightness controls.");return new{level=values[0]};
    }
    static bool IsCaptureOverlay(IntPtr window){try{GetWindowThreadProcessId(window,out var processId);using var process=Process.GetProcessById((int)processId);return new[]{"SnippingTool","ScreenClippingHost","ScreenSketch","SnipAndSketch"}.Contains(process.ProcessName,StringComparer.OrdinalIgnoreCase);}catch{return false;}}
    [DllImport("user32.dll")]static extern bool IsZoomed(IntPtr window);
    static object SystemState()
    {
        double cpu=0;if(GetSystemTimes(out var idle,out var kernel,out var user)){var total=(ulong)kernel+(ulong)user-CpuKernel-CpuUser;var id=(ulong)idle-CpuIdle;if(CpuIdle!=0&&total>0)cpu=100*(1-id/(double)total);CpuIdle=(ulong)idle;CpuKernel=(ulong)kernel;CpuUser=(ulong)user;}
        var memory=new MemoryStatus{length=(uint)Marshal.SizeOf<MemoryStatus>()};GlobalMemoryStatusEx(ref memory);
        var power=SystemInformation.PowerStatus;var front=GetForegroundWindow();var rect=new Rect();GetWindowRect(front,out rect);var display=Screen.FromHandle(front).Bounds;
        var captureOverlay=IsCaptureOverlay(front);
        var fullscreen=External(front)&&rect.left<=display.Left&&rect.top<=display.Top&&rect.right>=display.Right&&rect.bottom>=display.Bottom;
        var connected=System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable();
        var language=InputLanguage.CurrentInputLanguage.Culture.TwoLetterISOLanguageName;try{var thread=GetWindowThreadProcessId(front,out _);language=System.Globalization.CultureInfo.GetCultureInfo((int)((long)GetKeyboardLayout(thread)&0xffff)).TwoLetterISOLanguageName;}catch{}
        object? volume=null;try{volume=Volume(default);}catch{}
        int? notificationState=null;try{if(SHQueryUserNotificationState(out var state)==0)notificationState=state;}catch{}
        // Shell notification state is a supplemental veto, not authoritative Windows Focus Assist detection.
        string processName="";try{GetWindowThreadProcessId(LastExternal,out var processId);using var process=Process.GetProcessById((int)processId);processName=process.ProcessName;}catch{}
        return new{processName,maximized=External(front)&&IsZoomed(front),monitorBounds=new{x=display.X,y=display.Y,width=display.Width,height=display.Height},cpu=Math.Round(cpu),gpu=CachedGpuUsage(),ram=memory.load,totalRam=memory.total,availableRam=memory.available,battery=power.BatteryLifePercent>=0?Math.Round(power.BatteryLifePercent*100):-1,charging=power.PowerLineStatus==PowerLineStatus.Online,connected,capsLock=Control.IsKeyLocked(Keys.CapsLock),language,volume,fullscreen,captureOverlay,meetingRecording=MeetingMic!=null,notificationState,foreground=LastExternal.ToInt64().ToString(),app=FocusInfo.Describe(LastExternal).AppName};
    }
    static object CaptureScreen()
    {
        var screen=Screen.FromHandle(LastExternal).Bounds;using var image=new Bitmap(screen.Width,screen.Height);using(var g=Graphics.FromImage(image))g.CopyFromScreen(screen.Left,screen.Top,0,0,screen.Size);using var memory=new MemoryStream();image.Save(memory,ImageFormat.Png);return new{image="data:image/png;base64,"+Convert.ToBase64String(memory.ToArray()),width=screen.Width,height=screen.Height,x=screen.X,y=screen.Y};
    }
    static object ClickAt(JsonElement value)
    {
        int x=(int)N(value,"x"),y=(int)N(value,"y");if(!Screen.AllScreens.Any(s=>s.Bounds.Contains(x,y)))throw new Exception("Point is outside all screens.");Cursor.Position=new Point(x,y);mouse_event(0x0002,0,0,0,UIntPtr.Zero);mouse_event(0x0004,0,0,0,UIntPtr.Zero);return true;
    }
    static object Shortcut(string keys)
    {
        var allowed=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){{"copy","^c"},{"paste","^v"},{"undo","^z"},{"save","^s"},{"find","^f"},{"select all","^a"},{"escape","{ESC}"},{"enter","{ENTER}"},{"tab","{TAB}"},{"next tab","^{TAB}"},{"previous tab","^+{TAB}"}};
        if(!allowed.TryGetValue(keys,out var chord))throw new Exception("Unsupported shortcut.");SendKeys.SendWait(chord);return true;
    }
    static object Speak(string text)
    {
        if(text.Length>10000)throw new Exception("Speech text too long.");RequireMicrophone();VoiceOutput??=new System.Speech.Synthesis.SpeechSynthesizer();VoiceOutput.SpeakAsync(text);return true;
    }
}
