using Microsoft.Win32;
using NAudio.Wave;
using Windows.UI.Notifications;

namespace IslandFusionNative;
internal static partial class Program
{
    static WasapiOut? ReminderSound;
    static WaveFileReader? ReminderAudio;
    static WaveChannel32? ReminderVolume;
    static object NotificationStatus()
    {
        static bool? Enabled(string key, string name)
        {
            try { using var item=Registry.CurrentUser.OpenSubKey(key);return item?.GetValue(name) is int value?value!=0:null; }
            catch { return null; }
        }
        string setting="Unknown",error="";
        try { setting=ToastNotificationManager.CreateToastNotifier("app.agentnotch.desktop").Setting.ToString(); }
        catch(Exception exception) { error=exception.Message; }
        int? shellState=null;try{if(SHQueryUserNotificationState(out var state)==0)shellState=state;}catch{}
        return new { appId="app.agentnotch.desktop",globalEnabled=Enabled(@"Software\Microsoft\Windows\CurrentVersion\PushNotifications","ToastEnabled"),appEnabled=Enabled(@"Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\app.agentnotch.desktop","Enabled"),setting,error,shellState,dnd="Unknown: shell state is only a supplemental interruption veto." };
    }
    static object PreviewReminderSound(System.Text.Json.JsonElement value)
    {
        var profile=S(value,"profile","default");
        var alias=profile switch {"default"=>"Notification.Default","book"=>"Notification.IM","course"=>"Notification.Mail","workout"=>"Notification.Reminder",_=>throw new Exception("Invalid sound profile.")};
        using var key=Registry.CurrentUser.OpenSubKey(@"AppEvents\Schemes\Apps\.Default\"+alias+@"\.Current");
        var file=Environment.ExpandEnvironmentVariables(key?.GetValue("") as string??"");
        if(!File.Exists(file))throw new Exception("No Windows sound is assigned to this profile. Choose a sound in Windows Sound settings.");
        ReminderSound?.Stop();ReminderSound?.Dispose();ReminderVolume?.Dispose();ReminderAudio?.Dispose();
        ReminderAudio=new WaveFileReader(file);ReminderVolume=new WaveChannel32(ReminderAudio) { Volume=(float)Math.Clamp(N(value,"volume",.5),0,1),PadWithZeroes=false };ReminderSound=new WasapiOut();
        ReminderSound.Init(ReminderVolume);ReminderSound.Play();
        return new { submitted=true,profile,message="Sound playback was submitted to the Windows audio device; audibility is not confirmed." };
    }
}
