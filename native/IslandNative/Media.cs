using System.Text.Json;
using Windows.Media;
using Windows.Media.Control;
using Windows.Storage.Streams;
namespace IslandFusionNative;
internal static partial class Program
{
    static string MediaPin="";
    static GlobalSystemMediaTransportControlsSession? ShownMedia;
    static bool Playing(GlobalSystemMediaTransportControlsSession s){try{return s.GetPlaybackInfo().PlaybackStatus==GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;}catch{return false;}}
    static async Task<object> MediaState(JsonElement value=default)
    {
        if(value.ValueKind==JsonValueKind.Object&&value.TryGetProperty("appId",out _)){var id=S(value,"appId");if(id.Length>1500)throw new Exception("Invalid media application.");MediaPin=id;}
        var manager=await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        var all=manager.GetSessions().Take(32).ToList();
        var sources=all.Select(s=>new{appId=s.SourceAppUserModelId,playing=Playing(s)}).DistinctBy(s=>s.appId).ToArray();
        GlobalSystemMediaTransportControlsSession? chosen;
        if(MediaPin.Length>0)chosen=all.FirstOrDefault(s=>s.SourceAppUserModelId==MediaPin&&s.Equals(ShownMedia))??all.FirstOrDefault(s=>s.SourceAppUserModelId==MediaPin&&Playing(s))??all.FirstOrDefault(s=>s.SourceAppUserModelId==MediaPin);
        else{var current=manager.GetCurrentSession();chosen=current!=null&&Playing(current)?current:all.FirstOrDefault(Playing)??current??all.FirstOrDefault();}
        ShownMedia=chosen;
        if(chosen==null)return new{available=false,pinnedAppId=MediaPin,sources,message=MediaPin.Length>0?"Pinned player is not available. Choose Automatic or another player.":"No Windows media session."};
        var track=await chosen.TryGetMediaPropertiesAsync();var info=chosen.GetPlaybackInfo();var timeline=chosen.GetTimelineProperties();var c=info.Controls;
        string? cover=null;
        if(track.Thumbnail!=null)try{using var stream=await track.Thumbnail.OpenReadAsync();if(stream.Size<2_000_000){using var reader=new DataReader(stream.GetInputStreamAt(0));await reader.LoadAsync((uint)stream.Size);var bytes=new byte[stream.Size];reader.ReadBytes(bytes);cover="data:"+stream.ContentType+";base64,"+Convert.ToBase64String(bytes);}}catch{}
        var duration=Math.Max(0,(timeline.EndTime-timeline.StartTime).TotalMilliseconds);var playing=Playing(chosen);
        var position=Math.Max(0,(timeline.Position-timeline.StartTime).TotalMilliseconds+(playing?Math.Max(0,(DateTimeOffset.UtcNow-timeline.LastUpdatedTime).TotalMilliseconds):0));if(duration>0)position=Math.Min(position,duration);
        return new{available=true,title=track.Title,artist=track.Artist,album=track.AlbumTitle,app=chosen.SourceAppUserModelId,pinnedAppId=MediaPin,sources,playing,position,duration,cover,shuffle=info.IsShuffleActive,repeat=info.AutoRepeatMode?.ToString()??"None",capabilities=new{play=c.IsPlayEnabled,pause=c.IsPauseEnabled,next=c.IsNextEnabled,previous=c.IsPreviousEnabled,seek=c.IsPlaybackPositionEnabled&&duration>0,shuffle=c.IsShuffleEnabled,repeat=c.IsRepeatEnabled}};
    }
    static async Task<object> MediaControl(string command,double position,JsonElement value=default)
    {
        if(ShownMedia==null)await MediaState();var target=ShownMedia??throw new Exception("No selected media player.");
        string expectedApp=S(value,"expectedApp"),expectedTitle=S(value,"expectedTitle");
        if(expectedApp.Length>0&&target.SourceAppUserModelId!=expectedApp)throw new Exception("The selected player changed. Refresh before controlling playback.");
        var properties=await target.TryGetMediaPropertiesAsync();if(expectedTitle.Length>0&&properties.Title!=expectedTitle)throw new Exception("The track changed. Refresh before controlling playback.");
        var controls=target.GetPlaybackInfo().Controls;
        bool result;
        switch(command){
            case "toggle":result=await target.TryTogglePlayPauseAsync();break;
            case "play":if(!controls.IsPlayEnabled)throw new Exception("Play is unavailable.");result=await target.TryPlayAsync();break;
            case "pause":if(!controls.IsPauseEnabled)throw new Exception("Pause is unavailable.");result=await target.TryPauseAsync();break;
            case "next":if(!controls.IsNextEnabled)throw new Exception("Next is unavailable.");result=await target.TrySkipNextAsync();break;
            case "previous":if(!controls.IsPreviousEnabled)throw new Exception("Previous is unavailable.");result=await target.TrySkipPreviousAsync();break;
            case "seek":if(!controls.IsPlaybackPositionEnabled)throw new Exception("This player cannot seek.");var time=target.GetTimelineProperties();var requested=time.StartTime.Ticks+(long)(Math.Max(0,position)*10000);result=await target.TryChangePlaybackPositionAsync(Math.Min(requested,time.EndTime.Ticks));break;
            case "shuffle":if(!controls.IsShuffleEnabled)throw new Exception("This player has no shuffle control.");result=await target.TryChangeShuffleActiveAsync(B(value,"enabled"));break;
            case "repeat":if(!controls.IsRepeatEnabled)throw new Exception("This player has no repeat control.");var mode=S(value,"mode");if(mode is not ("None" or "List" or "Track"))throw new Exception("Choose a supported repeat mode.");result=await target.TryChangeAutoRepeatModeAsync(Enum.Parse<MediaPlaybackAutoRepeatMode>(mode));break;
            default:throw new Exception("Unsupported media command.");
        }
        if(!result)throw new Exception("The selected player rejected this control.");return true;
    }
}
