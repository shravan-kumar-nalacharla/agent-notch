using System.Text.Json;
namespace IslandFusionNative;
internal static partial class Program
{
    static WindowsTerminalSession? ManualTerminal;
    static readonly SemaphoreSlim TerminalGate=new(1,1);
    static async Task<object> TerminalAction(string action,JsonElement v)
    {
        if(action=="terminal.capabilities")return WindowsTerminalSession.Capabilities();
        if(action is "terminal.status" or "terminal.drain" or "terminal.write" or "terminal.resize"){
            var current=ManualTerminal;
            if(action=="terminal.status")return current?.Drain(false)??new{id="",running=false,engine="Windows ConPTY"};
            if(current==null||current.Id!=S(v,"id"))throw new Exception("Terminal session expired.");
            if(action=="terminal.drain")return current.Drain();
            if(action=="terminal.write"){current.Write(S(v,"text"));return true;}
            await Task.Run(()=>current.Resize((int)N(v,"cols"),(int)N(v,"rows")));return true;
        }
        await TerminalGate.WaitAsync();try{
            if(action=="terminal.start"){
                if(ManualTerminal!=null)throw new Exception("Close the current terminal before starting another.");
                ManualTerminal=await Task.Run(()=>new WindowsTerminalSession(S(v,"shell","powershell"),S(v,"directory"),(int)N(v,"cols",80),(int)N(v,"rows",24)));
                return ManualTerminal.Drain();
            }
            if(ManualTerminal==null||ManualTerminal.Id!=S(v,"id"))throw new Exception("Terminal session expired.");
            if(action=="terminal.close"){var closing=ManualTerminal;ManualTerminal=null;await Task.Run(closing.Dispose);return true;}
            throw new Exception("Unsupported terminal operation.");
        }finally{TerminalGate.Release();}
    }
}
