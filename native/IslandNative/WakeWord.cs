using System.Speech.Recognition;
using System.Text.Json;
namespace IslandFusionNative;
internal static partial class Program
{
    static SpeechRecognitionEngine? Wake;
    static bool WakePaused;
    static string CompanionName="Cutie";
    static DateTime LastWake=DateTime.MinValue,LastChatSpeech;
    static bool ChatHeardSpeech;
    static async Task<object> TestWakeAudio(JsonElement value)
    {
        var audio=S(value,"audio");var name=S(value,"name","Cutie");if(audio.Length>1400000||name.Length<2||name.Length>30||name.Any(c=>!char.IsLetterOrDigit(c)&&c!=' '))throw new Exception("Invalid wake test input.");
        return await Task.Run<object>(()=>{var info=SpeechRecognitionEngine.InstalledRecognizers().FirstOrDefault(r=>r.Culture.TwoLetterISOLanguageName=="en")??throw new Exception("English Windows recognizer unavailable.");using var engine=new SpeechRecognitionEngine(info);var builder=new GrammarBuilder{Culture=info.Culture};builder.Append("hey "+name);engine.LoadGrammar(new Grammar(builder));using var stream=new MemoryStream();if(audio.Length==0){using var voice=new System.Speech.Synthesis.SpeechSynthesizer();voice.SetOutputToWaveStream(stream);voice.Speak("hey "+name);voice.SetOutputToNull();stream.Position=0;}else{stream.Write(Convert.FromBase64String(audio));stream.Position=0;}engine.SetInputToWaveStream(stream);var result=engine.Recognize(TimeSpan.FromSeconds(5));return new{recognized=result!=null&&result.Confidence>=.60,text=result?.Text,confidence=result?.Confidence,culture=info.Culture.Name,input=audio.Length==0?"Windows-generated synthetic phrase; microphone not used":"provided synthetic test WAV; microphone not used"};});
    }
    static object ConfigureWake(JsonElement value)
    {
        Wake?.Dispose();Wake=null;WakePaused=false;CompanionName=S(value,"name","Cutie").Trim();
        if(CompanionName.Length<2||CompanionName.Length>30||CompanionName.Any(c=>!char.IsLetterOrDigit(c)&&c!=' '))throw new Exception("Choose a companion name of 2–30 letters, spaces or numbers.");
        if(PrivacyBlocked||ListeningMode!="always"||!B(value,"enabled"))return new{enabled=false,name=CompanionName};
        var recognizers=SpeechRecognitionEngine.InstalledRecognizers();
        var info=recognizers.FirstOrDefault(r=>r.Culture.TwoLetterISOLanguageName=="en")??recognizers.FirstOrDefault();
        if(info==null)throw new Exception("No Windows speech recognizer is installed. Add an English speech language in Windows Settings to enable the wake name.");
        var engine=new SpeechRecognitionEngine(info);try{
            var builder=new GrammarBuilder{Culture=info.Culture};builder.Append("hey "+CompanionName);engine.LoadGrammar(new Grammar(builder));
            engine.SpeechRecognized+=(_,e)=>{if(PrivacyBlocked||ListeningMode!="always"||WakePaused||Capture!=null||e.Result.Confidence<.60||DateTime.UtcNow-LastWake<TimeSpan.FromSeconds(5))return;LastWake=DateTime.UtcNow;WakePaused=true;Emit(new{type="wake.detected",name=CompanionName,confidence=e.Result.Confidence});};
            engine.SetInputToDefaultAudioDevice();engine.RecognizeAsync(RecognizeMode.Multiple);Wake=engine;
        }catch{engine.Dispose();throw;}
        return new{enabled=true,available=true,name=CompanionName,phrase="hey "+CompanionName,culture=info.Culture.Name};
    }
}
