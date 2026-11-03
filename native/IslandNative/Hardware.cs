using System.Diagnostics;
using System.Net.NetworkInformation;
namespace IslandFusionNative;
internal static partial class Program
{
    static readonly Dictionary<int,(DateTime started,TimeSpan cpu)> ProcessSamples=new();
    static long ProcessSampleAt;
    static object HardwareSnapshot()
    {
        var at=Environment.TickCount64;var elapsed=(at-ProcessSampleAt)/1000.0;var processes=new List<object>();var measurements=new List<(int pid,string name,long memory,double? cpu)>();var next=new Dictionary<int,(DateTime,TimeSpan)>();
        foreach(var process in Process.GetProcesses())using(process){try{var id=process.Id;var started=process.StartTime.ToUniversalTime();var cpu=process.TotalProcessorTime;double? percentage=null;if(elapsed>0&&ProcessSamples.TryGetValue(id,out var prior)&&prior.started==started)percentage=Math.Clamp((cpu-prior.cpu).TotalSeconds/elapsed/Environment.ProcessorCount*100,0,100);next[id]=(started,cpu);measurements.Add((id,process.ProcessName,process.WorkingSet64,percentage));}catch{}}
        ProcessSamples.Clear();foreach(var pair in next)ProcessSamples[pair.Key]=pair.Value;ProcessSampleAt=at;
        foreach(var p in measurements.OrderByDescending(p=>p.memory).Take(12))processes.Add(new{p.pid,p.name,workingSet=p.memory,cpu=p.cpu});
        var drives=new List<object>();foreach(var drive in DriveInfo.GetDrives())try{if(drive.DriveType!=DriveType.Fixed||!drive.IsReady)continue;drives.Add(new{name=drive.Name,total=drive.TotalSize,free=drive.AvailableFreeSpace});}catch{}
        var networks=new List<object>();foreach(var device in NetworkInterface.GetAllNetworkInterfaces())try{if(device.NetworkInterfaceType is NetworkInterfaceType.Loopback or NetworkInterfaceType.Tunnel||device.OperationalStatus!=OperationalStatus.Up)continue;var stats=device.GetIPStatistics();networks.Add(new{id=device.Id,name=device.Name,received=stats.BytesReceived,sent=stats.BytesSent});}catch{}
        _=CachedGpuUsage();return new{sampleAt=at,processes,drives,networks,cpuTemperature=(double?)null,gpuTemperature=(double?)null,powerWatts=(double?)null,vramBytes=(long?)null,fps=(double?)null,limitations="Temperature, power, VRAM and game FPS require a separately supported sensor provider. No driver or game injection is installed."};
    }
}
