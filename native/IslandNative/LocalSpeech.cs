using System.Speech.Recognition;
using System.Text.Json;
namespace IslandFusionNative;
internal static partial class Program
{
    // Optional local transcription. Uses the Windows speech recognizer already
    // installed on the machine; no audio leaves the process and no provider key
    // is required. Quality depends on the installed Windows speech language.
    static async Task<object> TranscribeLocal(JsonElement value)
    {
        var audio=S(value,"audio");
        if(audio.Length==0)throw new Exception("No audio was provided.");
        if(audio.Length>8_000_000)throw new Exception("Local transcription is limited to one segment.");
        byte[] bytes;
        try{bytes=Convert.FromBase64String(audio);}catch{throw new Exception("Audio is not valid base64.");}
        if(bytes.Length<100||bytes.Length>6_000_000)throw new Exception("Recording must be between 100 bytes and 6 MB.");
        return await Task.Run<object>(()=>{
            var recognizers=SpeechRecognitionEngine.InstalledRecognizers();
            var info=recognizers.FirstOrDefault(r=>r.Culture.TwoLetterISOLanguageName=="en")??recognizers.FirstOrDefault();
            if(info==null)throw new Exception("No Windows speech recognizer is installed. Add a speech language in Windows Settings.");
            using var engine=new SpeechRecognitionEngine(info);
            engine.LoadGrammar(new DictationGrammar());
            using var stream=new MemoryStream(bytes);
            engine.SetInputToWaveStream(stream);
            var result=engine.Recognize(TimeSpan.FromSeconds(20));
            var text=result?.Text?.Trim()??"";
            if(text.Length==0)throw new Exception("No speech was recognized. Try again closer to the microphone.");
            return new{text,confidence=result?.Confidence??0,culture=info.Culture.Name,engine="Windows System.Speech",offline=true};
        });
    }
}
