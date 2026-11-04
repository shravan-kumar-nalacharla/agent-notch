using System.Collections.Concurrent;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;
namespace IslandFusionNative;

// Manual ConPTY sessions have no connection to the assistant's action planner.
internal sealed class WindowsTerminalSession : IDisposable
{
    [StructLayout(LayoutKind.Sequential)] struct Coord { public short X,Y; }
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct Startup { public int cb;public string? reserved,desktop,title;public int x,y,xSize,ySize,xChars,yChars,fill,flags;public short show,reservedSize;public IntPtr reservedPtr,input,output,error; }
    [StructLayout(LayoutKind.Sequential)] struct StartupEx { public Startup startup;public IntPtr attributes; }
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process,thread;public uint processId,threadId; }
    [StructLayout(LayoutKind.Sequential)] struct JobLimits { public long processTime,jobTime;public uint flags;public UIntPtr minimum,maximum;public uint activeLimit;public UIntPtr affinity;public uint priority,scheduling; }
    [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong readOperations,writeOperations,otherOperations,readBytes,writeBytes,otherBytes; }
    [StructLayout(LayoutKind.Sequential)] struct ExtendedJob { public JobLimits basic;public IoCounters io;public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool CreatePipe(out IntPtr read,out IntPtr write,IntPtr attributes,uint size);
    [DllImport("kernel32.dll")] static extern int CreatePseudoConsole(Coord size,IntPtr input,IntPtr output,uint flags,out IntPtr console);
    [DllImport("kernel32.dll")] static extern int ResizePseudoConsole(IntPtr console,Coord size);
    [DllImport("kernel32.dll")] static extern void ClosePseudoConsole(IntPtr console);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,uint flags,ref IntPtr size);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returnSize);
    [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcessW(string app,StringBuilder command,IntPtr processAttributes,IntPtr threadAttributes,bool inherit,uint flags,IntPtr environment,string cwd,ref StartupEx startup,out ProcessInfo process);
    [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr CreateJobObjectW(IntPtr attributes,IntPtr name);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int info,ref ExtendedJob value,int length);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
    [DllImport("kernel32.dll")] static extern bool TerminateJobObject(IntPtr job,uint code);
    [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint code);
    [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    readonly object gate=new(),controlGate=new();readonly StringBuilder output=new();readonly BlockingCollection<byte[]> inputQueue=new(64);
    FileStream? input,reader;IntPtr console,process,job;bool disposed,truncated;string ioError="";
    public string Id {get;}=Guid.NewGuid().ToString("N");public string Shell {get;}public string Directory {get;}public uint Pid {get;private set;}
    static string Executable(string shell)=>shell switch{"cmd"=>Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"cmd.exe"),"powershell"=>Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),"WindowsPowerShell/v1.0/powershell.exe"),"pwsh"=>Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"PowerShell/7/pwsh.exe"),_=>throw new Exception("Choose a supported Windows shell.")};
    public static object Capabilities()=>new{engine="Windows ConPTY",encoding="UTF-8",shells=new[]{"powershell","pwsh","cmd"}.Select(shell=>new{id=shell,available=File.Exists(Executable(shell))}).ToArray()};
    public WindowsTerminalSession(string shell,string directory,int cols,int rows)
    {
        var executable=Executable(shell);if(!File.Exists(executable))throw new Exception("That shell is not installed at its supported Windows location.");
        if(!Path.IsPathFullyQualified(directory)||!System.IO.Directory.Exists(directory))throw new Exception("Choose an existing working directory.");
        Shell=shell;Directory=directory;IntPtr inputRead=IntPtr.Zero,inputWrite=IntPtr.Zero,outputRead=IntPtr.Zero,outputWrite=IntPtr.Zero,attributes=IntPtr.Zero;var info=new ProcessInfo();bool initialized=false;
        try{
            if(!CreatePipe(out inputRead,out inputWrite,IntPtr.Zero,0)||!CreatePipe(out outputRead,out outputWrite,IntPtr.Zero,0))throw new Win32Exception();
            Marshal.ThrowExceptionForHR(CreatePseudoConsole(Size(cols,rows),inputRead,outputWrite,0,out console));
            input=new FileStream(new SafeFileHandle(inputWrite,true),FileAccess.Write);inputWrite=IntPtr.Zero;
            reader=new FileStream(new SafeFileHandle(outputRead,true),FileAccess.Read);outputRead=IntPtr.Zero;
            _=Task.Run(ReadOutput);_=Task.Run(WriteInput);
            var bytes=IntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref bytes);attributes=Marshal.AllocHGlobal(bytes);
            if(!InitializeProcThreadAttributeList(attributes,1,0,ref bytes))throw new Win32Exception();initialized=true;
            if(!UpdateProcThreadAttribute(attributes,0,new IntPtr(0x00020016),console,new IntPtr(IntPtr.Size),IntPtr.Zero,IntPtr.Zero))throw new Win32Exception();
            job=CreateJobObjectW(IntPtr.Zero,IntPtr.Zero);if(job==IntPtr.Zero)throw new Win32Exception();var limits=new ExtendedJob();limits.basic.flags=0x2000;
            if(!SetInformationJobObject(job,9,ref limits,Marshal.SizeOf<ExtendedJob>()))throw new Win32Exception();
            const string noHistory="if(Get-Module -ListAvailable -Name PSReadLine){Import-Module PSReadLine;if((Get-Command Set-PSReadLineOption).Parameters.ContainsKey('HistorySaveStyle')){Set-PSReadLineOption -HistorySaveStyle SaveNothing}else{Remove-Module PSReadLine}}";
            // Explicit null standard handles keep the shell out of the helper's JSON pipes.
            var command=new StringBuilder('"'+executable+'"'+(shell=="cmd"?" /d":" -NoLogo -NoProfile -NoExit -Command \""+noHistory+"\""));var startup=new StartupEx{startup=new Startup{cb=Marshal.SizeOf<StartupEx>(),flags=0x100,input=IntPtr.Zero,output=IntPtr.Zero,error=IntPtr.Zero},attributes=attributes};
            if(!CreateProcessW(executable,command,IntPtr.Zero,IntPtr.Zero,false,0x00080004,IntPtr.Zero,directory,ref startup,out info))throw new Win32Exception();
            process=info.process;Pid=info.processId;
            if(!AssignProcessToJobObject(job,process)){var error=Marshal.GetLastWin32Error();TerminateProcess(process,1);throw new Win32Exception(error);}
            if(ResumeThread(info.thread)==uint.MaxValue)throw new Win32Exception();
        }catch{Dispose();throw;}
        finally{if(info.thread!=IntPtr.Zero)CloseHandle(info.thread);if(attributes!=IntPtr.Zero){if(initialized)DeleteProcThreadAttributeList(attributes);Marshal.FreeHGlobal(attributes);}foreach(var handle in new[]{inputRead,inputWrite,outputRead,outputWrite})if(handle!=IntPtr.Zero)CloseHandle(handle);}
    }
    static Coord Size(int cols,int rows){if(cols<2||cols>500||rows<2||rows>200)throw new Exception("Terminal dimensions are outside the supported range.");return new Coord{X=(short)cols,Y=(short)rows};}
    void ReadOutput(){var bytes=new byte[8192];var chars=new char[8192];var decoder=Encoding.UTF8.GetDecoder();try{int count;while(reader!=null&&(count=reader.Read(bytes,0,bytes.Length))>0){var used=decoder.GetChars(bytes,0,count,chars,0);lock(gate){output.Append(chars,0,used);if(output.Length>262144){output.Remove(0,output.Length-262144);truncated=true;}}}}catch(Exception e)when(e is IOException or ObjectDisposedException){lock(gate)if(!disposed)ioError="Terminal output stream ended.";}}
    void WriteInput(){try{foreach(var bytes in inputQueue.GetConsumingEnumerable()){input?.Write(bytes,0,bytes.Length);input?.Flush();}}catch(Exception e)when(e is IOException or ObjectDisposedException){lock(gate)if(!disposed)ioError="Terminal input stream ended.";}}
    public void Write(string text){if(text.Length>16384)throw new Exception("Terminal input is limited to 16,384 characters per event.");lock(gate){if(disposed||!Running())throw new Exception("This terminal session has ended.");if(!inputQueue.TryAdd(Encoding.UTF8.GetBytes(text)))throw new Exception("Terminal input is busy. Wait and retry.");}}
    bool Running()=>!disposed&&process!=IntPtr.Zero&&GetExitCodeProcess(process,out var code)&&code==259;
    public object Drain(bool consume=true){lock(gate){var count=consume?Math.Min(32768,output.Length):0;var text=output.ToString(0,count);if(consume)output.Remove(0,count);var dropped=consume&&truncated;if(consume)truncated=false;return new{id=Id,shell=Shell,directory=Directory,pid=Pid,running=Running(),data=text,truncated=dropped,error=ioError,engine="Windows ConPTY"};}}
    public void Resize(int cols,int rows){var size=Size(cols,rows);lock(controlGate){lock(gate)if(disposed)throw new Exception("Terminal session has ended.");Marshal.ThrowExceptionForHR(ResizePseudoConsole(console,size));}}
    public void Dispose(){lock(gate){if(disposed)return;disposed=true;inputQueue.CompleteAdding();}if(job!=IntPtr.Zero)TerminateJobObject(job,0);lock(controlGate){if(job!=IntPtr.Zero){CloseHandle(job);job=IntPtr.Zero;}if(console!=IntPtr.Zero){ClosePseudoConsole(console);console=IntPtr.Zero;}input?.Dispose();reader?.Dispose();if(process!=IntPtr.Zero){CloseHandle(process);process=IntPtr.Zero;}}}
}
