using System.Drawing.Imaging;
using System.Text.Json;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage.Streams;
namespace IslandFusionNative;
internal static partial class Program
{
    static object CaptureSources()=>Screen.AllScreens.Select(s=>new{id=s.DeviceName,name=s.DeviceName,primary=s.Primary,x=s.Bounds.X,y=s.Bounds.Y,width=s.Bounds.Width,height=s.Bounds.Height}).ToArray();
    static async Task<object> CaptureDesktop(JsonElement v,bool ocr)
    {
        var id=S(v,"source");var selected=Screen.AllScreens.FirstOrDefault(s=>s.DeviceName==id);
        if(id!="all"&&selected==null)throw new Exception("Choose a connected display.");
        var bounds=id=="all"?SystemInformation.VirtualScreen:selected!.Bounds;
        if(v.TryGetProperty("region",out var region)){
            var x=region.GetProperty("x").GetInt32();var y=region.GetProperty("y").GetInt32();var width=region.GetProperty("width").GetInt32();var height=region.GetProperty("height").GetInt32();
            if(x<0||y<0||width<1||height<1||(long)x+width>bounds.Width||(long)y+height>bounds.Height)throw new Exception("Select an area within the display.");
            bounds=new Rectangle(bounds.X+x,bounds.Y+y,width,height);
        }
        if(bounds.Width<=0||bounds.Height<=0||(long)bounds.Width*bounds.Height>64000000)throw new Exception("Capture exceeds the 64 megapixel limit. Choose one display.");
        using var image=new Bitmap(bounds.Width,bounds.Height);using(var graphics=Graphics.FromImage(image))graphics.CopyFromScreen(bounds.Left,bounds.Top,0,0,bounds.Size);
        using var memory=new MemoryStream();image.Save(memory,ImageFormat.Png);var bytes=memory.ToArray();
        if(bytes.Length>24000000)throw new Exception("Capture exceeds the supported file size. Choose one display.");
        var items=new List<object>();double scale=1;
        if(ocr){
            var engine=OcrEngine.TryCreateFromUserProfileLanguages();if(engine==null)throw new Exception("Install a Windows OCR language pack to search screen text.");
            scale=Math.Min(1,(double)OcrEngine.MaxImageDimension/Math.Max(bounds.Width,bounds.Height));
            using var input=new InMemoryRandomAccessStream();using(var writer=new DataWriter(input.GetOutputStreamAt(0))){writer.WriteBytes(bytes);await writer.StoreAsync();await writer.FlushAsync();}
            input.Seek(0);var decoder=await BitmapDecoder.CreateAsync(input);var transform=new BitmapTransform{ScaledWidth=(uint)Math.Max(1,bounds.Width*scale),ScaledHeight=(uint)Math.Max(1,bounds.Height*scale)};
            using var bitmap=await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,transform,ExifOrientationMode.IgnoreExifOrientation,ColorManagementMode.DoNotColorManage);
            var result=await engine.RecognizeAsync(bitmap);
            foreach(var line in result.Lines.Take(500)){if(line.Words.Count==0)continue;var x=line.Words.Min(w=>w.BoundingRect.X)/scale;var y=line.Words.Min(w=>w.BoundingRect.Y)/scale;var right=line.Words.Max(w=>w.BoundingRect.Right)/scale;var bottom=line.Words.Max(w=>w.BoundingRect.Bottom)/scale;items.Add(new{text=line.Text,x,y,width=right-x,height=bottom-y});}
        }
        return new{image="data:image/png;base64,"+Convert.ToBase64String(bytes),width=bounds.Width,height=bounds.Height,x=bounds.X,y=bounds.Y,items,localOnly=true};
    }
}
