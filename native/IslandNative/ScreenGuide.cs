using System.Drawing.Imaging;
using System.Windows.Automation;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;
namespace IslandFusionNative;
internal static partial class Program
{
    static object ScreenProbe()=>new{ready=OcrEngine.TryCreateFromUserProfileLanguages()!=null,features=new[]{"capture","windows_ocr","uia","grounding"},readOnly=true,engine="Windows native",pythonRequired=false};
    static async Task<object> ObserveScreen()
    {
        var screen=Screen.PrimaryScreen!.Bounds;var scale=Math.Min(1,2048.0/Math.Max(screen.Width,screen.Height));
        var width=(int)(screen.Width*scale);var height=(int)(screen.Height*scale);
        using var full=new Bitmap(screen.Width,screen.Height);using(var g=Graphics.FromImage(full))g.CopyFromScreen(screen.Left,screen.Top,0,0,screen.Size);
        using var image=new Bitmap(full,width,height);using var memory=new MemoryStream();image.Save(memory,ImageFormat.Png);
        var temporary=Path.Combine(Path.GetTempPath(),"notch-ocr-"+Guid.NewGuid().ToString("N")+".png");
        var items=new List<object>();var warnings=new List<string>();
        try{
            await File.WriteAllBytesAsync(temporary,memory.ToArray());var file=await StorageFile.GetFileFromPathAsync(temporary);using var stream=await file.OpenReadAsync();var decoder=await BitmapDecoder.CreateAsync(stream);using var bitmap=await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied);
            var engine=OcrEngine.TryCreateFromUserProfileLanguages();if(engine==null)throw new Exception("Install a Windows OCR language to use screen guidance.");var result=await engine.RecognizeAsync(bitmap);
            foreach(var line in result.Lines.Take(220)){if(line.Words.Count==0)continue;var x=line.Words.Min(w=>w.BoundingRect.X);var y=line.Words.Min(w=>w.BoundingRect.Y);var right=line.Words.Max(w=>w.BoundingRect.Right);var bottom=line.Words.Max(w=>w.BoundingRect.Bottom);items.Add(new{text=line.Text,x,y,width=right-x,height=bottom-y,source="ocr"});}
        }finally{try{File.Delete(temporary);}catch{}}
        var uia=Task.Run(()=>{
            var controls=new List<object>();var root=AutomationElement.FromHandle(LastExternal);if(root==null)return controls;
            var found=root.FindAll(TreeScope.Descendants,new AndCondition(new PropertyCondition(AutomationElement.IsOffscreenProperty,false),new PropertyCondition(AutomationElement.IsPasswordProperty,false)));
            for(var i=0;i<Math.Min(found.Count,250);i++){try{var current=found[i].Current;var r=current.BoundingRectangle;var text=current.Name;if(string.IsNullOrWhiteSpace(text)||text.Length>500||r.IsEmpty||r.Width<=0||r.Height<=0||!screen.IntersectsWith(new Rectangle((int)r.X,(int)r.Y,(int)r.Width,(int)r.Height)))continue;controls.Add(new{text,x=(r.X-screen.X)*scale,y=(r.Y-screen.Y)*scale,width=r.Width*scale,height=r.Height*scale,source="uia"});}catch{}}
            return controls;
        });
        if(await Task.WhenAny(uia,Task.Delay(2000))==uia){try{items.AddRange(await uia);}catch{warnings.Add("UI Automation unavailable; visible OCR used.");}}else warnings.Add("UI Automation timed out; visible OCR used.");
        return new{image="data:image/png;base64,"+Convert.ToBase64String(memory.ToArray()),width,height,physicalWidth=screen.Width,physicalHeight=screen.Height,items,warnings,readOnly=true};
    }
}
